import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { prisma, type User } from '@warchest/db';
import { z } from 'zod';
import { COOKIE, setSessionCookie, signSession, userIdFromRequest, verifyWalletSignature } from '../auth';
import { ENV } from '../env';
import { materializeVillage } from '../materialize';
import { checkQuests } from '../quests';
import { serializeVillage } from '../serialize';
import { store } from '../store';
import { createUserWithVillage } from '../village-init';

/** Salted hash of the client IP — never the raw address (privacy). */
export function ipHashOf(req: FastifyRequest): string | null {
  const ip = req.ip;
  if (!ip) return null;
  return createHash('sha256').update(`${ip}|${ENV.JWT_SECRET}`).digest('hex').slice(0, 32);
}

export async function requireUser(req: FastifyRequest): Promise<User> {
  const uid = await userIdFromRequest(req);
  if (!uid) throw Object.assign(new Error('unauthorized'), { statusCode: 401 });
  const user = await prisma().user.findUnique({ where: { id: uid } });
  if (!user) throw Object.assign(new Error('unauthorized'), { statusCode: 401 });
  if (user.banned) throw Object.assign(new Error('account banned'), { statusCode: 403 });
  // keep the multi-account heuristic fresh (cheap: only writes on change)
  const h = ipHashOf(req);
  if (h && user.ipHash !== h) {
    user.ipHash = h;
    void prisma().user.update({ where: { id: user.id }, data: { ipHash: h } }).catch(() => undefined);
  }
  return user;
}

export async function stateFor(user: User): Promise<object> {
  const v = await materializeVillage(user.id);
  await checkQuests(v, !!user.wallet);
  return serializeVillage(v, user);
}

export function authRoutes(app: FastifyInstance): void {
  // Guest session: returns the existing session's state or creates a fresh village.
  app.post('/auth/guest', async (req, reply) => {
    const body = z.object({ ref: z.string().max(12).optional() }).parse(req.body ?? {});
    let user: User | null = null;
    const uid = await userIdFromRequest(req);
    if (uid) user = await prisma().user.findUnique({ where: { id: uid } });
    if (!user || user.banned) {
      const newId = await createUserWithVillage();
      const h = ipHashOf(req);
      if (h) await prisma().user.update({ where: { id: newId }, data: { ipHash: h } });
      // referral: ?ref=<player id suffix> — reward lands on the recruit's first raid
      if (body.ref && /^[A-Za-z0-9]{4,12}$/.test(body.ref)) {
        const inviter = await prisma().user.findFirst({
          where: { id: { endsWith: body.ref.toLowerCase() } },
        });
        // same network as the inviter → no referral credit (self-invite farm)
        if (inviter && inviter.id !== newId && (!h || inviter.ipHash !== h))
          await prisma().user.update({ where: { id: newId }, data: { refBy: inviter.id } });
      }
      user = await prisma().user.findUniqueOrThrow({ where: { id: newId } });
      setSessionCookie(reply, await signSession(user.id));
    }
    return stateFor(user);
  });

  app.get('/auth/nonce', async () => {
    const nonce = randomBytes(16).toString('hex');
    await store().setex(`wc:nonce:${nonce}`, 600, '1');
    return { nonce };
  });

  // SIWS: link the wallet to the current guest, or log into the wallet's user.
  app.post('/auth/wallet', async (req, reply: FastifyReply) => {
    const body = z
      .object({ wallet: z.string().min(32).max(48), signature: z.string().min(64).max(120), nonce: z.string().length(32) })
      .parse(req.body);
    const nonceKey = `wc:nonce:${body.nonce}`;
    if (!(await store().get(nonceKey)))
      return reply.code(400).send({ error: 'bad or expired nonce' });
    await store().del(nonceKey);
    if (!verifyWalletSignature(body.wallet, body.nonce, body.signature))
      return reply.code(401).send({ error: 'signature verification failed' });

    const db = prisma();
    let user = await db.user.findUnique({ where: { wallet: body.wallet } });
    if (!user) {
      // attach wallet to the current session user (guest), or create fresh
      const current = await userIdFromRequest(req);
      if (current) {
        const cu = await db.user.findUnique({ where: { id: current } });
        if (cu && !cu.wallet && !cu.banned) {
          user = await db.user.update({ where: { id: cu.id }, data: { wallet: body.wallet } });
        }
      }
      if (!user) {
        const id = await createUserWithVillage();
        user = await db.user.update({ where: { id }, data: { wallet: body.wallet } });
      }
    }
    if (user.banned) return reply.code(403).send({ error: 'account banned' });
    if (ENV.ADMIN_WALLET && body.wallet === ENV.ADMIN_WALLET && !user.isAdmin)
      user = await db.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    setSessionCookie(reply, await signSession(user.id));
    return stateFor(user);
  });

  app.get('/me', async (req) => {
    const user = await requireUser(req);
    return stateFor(user);
  });

  // Daily war chest: escalating streak reward, 20h cooldown, 48h grace.
  app.post('/daily/claim', async (req, reply) => {
    const user = await requireUser(req);
    const db = prisma();
    const now = new Date();
    const v = await db.village.findUniqueOrThrow({ where: { userId: user.id } });
    const last = v.lastDailyAt?.getTime() ?? 0;
    if (now.getTime() - last < 20 * 3600e3)
      return reply.code(400).send({ error: 'Already claimed — come back tomorrow' });
    const streak = now.getTime() - last < 48 * 3600e3 ? v.dailyStreak + 1 : 1;
    const LADDER = [5, 8, 12, 16, 20, 25, 30] as const;
    const reward = LADDER[Math.min(streak - 1, LADDER.length - 1)]!;
    await db.village.update({
      where: { id: v.id },
      data: { war: { increment: reward }, lastDailyAt: now, dailyStreak: streak },
    });
    await db.warLedger.create({
      data: { userId: user.id, delta: reward, reason: 'daily', refId: String(streak) },
    });
    return stateFor(user);
  });

  // Commander name: required before first entry; lives on the account, so it
  // rides along when the wallet is connected (guest → wallet link keeps the row).
  app.post('/profile/name', async (req, reply) => {
    const user = await requireUser(req);
    const { name } = z.object({ name: z.string().max(64) }).parse(req.body);
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-z0-9_ ]{3,16}$/.test(clean))
      return reply.code(400).send({ error: 'Name must be 3-16 letters, numbers, spaces or _' });
    const updated = await prisma().user.update({ where: { id: user.id }, data: { name: clean } });
    return stateFor(updated);
  });

  // "Reset village": drop the session; the next /auth/guest starts fresh.
  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });
}
