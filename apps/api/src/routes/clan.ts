/**
 * Clans + war-room chat. A finished Clan Hall unlocks everything here:
 * found a clan (gold), join one, and talk in the global / clan channels.
 * Clan capacity follows the LEADER's Clan Hall level (CLAN_CAP_BY_HALL).
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import {
  CHAT_COOLDOWN_S,
  CHAT_MAX_LEN,
  CLAN_CREATE_COST,
  clanCap,
} from '@warchest/game-core';
import { z } from 'zod';
import { requireUser } from './auth';

const NAME_RE = /^[A-Za-z0-9_ ]{3,20}$/;

class ClanError extends Error {
  statusCode = 400;
}
const bad = (msg: string): never => {
  throw new ClanError(msg);
};

/** Highest FINISHED Clan Hall level for a user (0 = none built yet). */
async function hallLvOf(userId: string, now: Date): Promise<number> {
  const rows = await prisma().building.findMany({
    where: { village: { userId }, type: 'clan' },
    select: { level: true, busyUntil: true, jobKind: true },
  });
  let lv = 0;
  for (const b of rows) {
    const busyNew = b.jobKind === 'new' && b.busyUntil && b.busyUntil.getTime() > now.getTime();
    if (!busyNew) lv = Math.max(lv, b.level);
  }
  return lv;
}

async function myMembership(userId: string) {
  return prisma().clanMember.findUnique({ where: { userId }, include: { clan: true } });
}

/** Full clan card: members (name + trophies), capacity from the leader's hall. */
async function clanInfo(clanId: string, now: Date): Promise<object | null> {
  const db = prisma();
  const clan = await db.clan.findUnique({
    where: { id: clanId },
    include: {
      members: {
        orderBy: { joinedAt: 'asc' },
        include: { user: { select: { id: true, name: true, village: { select: { trophies: true } } } } },
      },
    },
  });
  if (!clan) return null;
  const cap = clanCap(await hallLvOf(clan.leaderId, now));
  return {
    id: clan.id,
    name: clan.name,
    desc: clan.desc,
    badge: clan.badge,
    leaderId: clan.leaderId,
    cap,
    count: clan.members.length,
    members: clan.members.map((m) => ({
      id: m.user.id,
      name: m.user.name ?? 'Commander',
      trophies: m.user.village?.trophies ?? 0,
      role: m.role,
    })),
  };
}

/* one message per CHAT_COOLDOWN_S per user (in-memory: single API process) */
const lastMsgAt = new Map<string, number>();

export function clanRoutes(app: FastifyInstance): void {
  /* ------------------------------- clans ------------------------------- */
  app.get('/clan/me', async (req) => {
    const user = await requireUser(req);
    const now = new Date();
    const [m, hallLv] = await Promise.all([myMembership(user.id), hallLvOf(user.id, now)]);
    return { hallLv, clan: m ? await clanInfo(m.clanId, now) : null };
  });

  // browse: biggest clans first, optional name search
  app.get('/clan/list', async (req) => {
    const { q } = z.object({ q: z.string().max(20).optional() }).parse(req.query ?? {});
    const clans = await prisma().clan.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      include: { _count: { select: { members: true } } },
      orderBy: { members: { _count: 'desc' } },
      take: 20,
    });
    return {
      clans: clans.map((c) => ({
        id: c.id,
        name: c.name,
        desc: c.desc,
        badge: c.badge,
        count: c._count.members,
      })),
    };
  });

  app.post('/clan/create', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({
        name: z.string().min(1).max(40),
        desc: z.string().max(120).optional(),
        badge: z.number().int().min(0).max(11).optional(),
      })
      .parse(req.body ?? {});
    const name = body.name.trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(name)) bad('Clan name must be 3-20 letters, numbers, spaces or _');
    const now = new Date();
    const db = prisma();
    if (await myMembership(user.id)) bad('Leave your current clan first');
    if ((await hallLvOf(user.id, now)) < 1) bad('Build a Clan Hall first');
    const taken = await db.clan.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (taken) bad('That clan name is taken');
    // atomic gold pay: the guard keeps a double-tap from founding two clans
    const paid = await db.village.updateMany({
      where: { userId: user.id, gold: { gte: CLAN_CREATE_COST } },
      data: { gold: { decrement: CLAN_CREATE_COST } },
    });
    if (paid.count === 0) bad(`Not enough Gold (founding costs ${CLAN_CREATE_COST.toLocaleString()})`);
    const clan = await db.clan.create({
      data: {
        name,
        desc: (body.desc ?? '').trim().slice(0, 120),
        badge: body.badge ?? 0,
        leaderId: user.id,
        members: { create: { userId: user.id, role: 'leader' } },
      },
    });
    return { ok: true, clan: await clanInfo(clan.id, now) };
  });

  app.post('/clan/join', async (req) => {
    const user = await requireUser(req);
    const { clanId } = z.object({ clanId: z.string().min(1).max(40) }).parse(req.body ?? {});
    const now = new Date();
    const db = prisma();
    if (await myMembership(user.id)) bad('Leave your current clan first');
    if ((await hallLvOf(user.id, now)) < 1) bad('Build a Clan Hall first');
    const clan = await db.clan.findUnique({
      where: { id: clanId },
      include: { _count: { select: { members: true } } },
    });
    if (!clan) bad('No such clan');
    const cap = clanCap(await hallLvOf(clan!.leaderId, now));
    if (clan!._count.members >= cap) bad('That clan is full');
    await db.clanMember.create({ data: { userId: user.id, clanId } });
    return { ok: true, clan: await clanInfo(clanId, now) };
  });

  app.post('/clan/leave', async (req) => {
    const user = await requireUser(req);
    const db = prisma();
    const m = await myMembership(user.id);
    if (!m) bad('You are not in a clan');
    await db.clanMember.delete({ where: { userId: user.id } });
    if (m!.role === 'leader') {
      // crown the longest-standing member; an empty clan disbands (chat cascades)
      const heir = await db.clanMember.findFirst({
        where: { clanId: m!.clanId },
        orderBy: { joinedAt: 'asc' },
      });
      if (heir) {
        await db.clanMember.update({ where: { userId: heir.userId }, data: { role: 'leader' } });
        await db.clan.update({ where: { id: m!.clanId }, data: { leaderId: heir.userId } });
      } else {
        await db.clan.delete({ where: { id: m!.clanId } });
      }
    }
    return { ok: true };
  });

  app.post('/clan/kick', async (req) => {
    const user = await requireUser(req);
    const { userId } = z.object({ userId: z.string().min(1).max(40) }).parse(req.body ?? {});
    const db = prisma();
    const me = await myMembership(user.id);
    if (!me || me.role !== 'leader') bad('Only the clan leader can kick');
    if (userId === user.id) bad('Use Leave instead');
    const target = await db.clanMember.findUnique({ where: { userId } });
    if (!target || target.clanId !== me!.clanId) bad('Not a member of your clan');
    await db.clanMember.delete({ where: { userId } });
    return { ok: true, clan: await clanInfo(me!.clanId, new Date()) };
  });

  /* -------------------------------- chat -------------------------------- */
  app.get('/chat', async (req) => {
    const user = await requireUser(req);
    const q = z
      .object({ ch: z.enum(['global', 'clan']).default('global'), after: z.coerce.number().int().min(0).default(0) })
      .parse(req.query ?? {});
    const db = prisma();
    let clanId: string | null = null;
    if (q.ch === 'clan') {
      const m = await myMembership(user.id);
      if (!m) bad('Join a clan to use its chat');
      clanId = m!.clanId;
    }
    const msgs = q.after
      ? await db.chatMessage.findMany({
          where: { clanId, id: { gt: q.after } },
          orderBy: { id: 'asc' },
          take: 100,
          include: { user: { select: { name: true } } },
        })
      : (
          await db.chatMessage.findMany({
            where: { clanId },
            orderBy: { id: 'desc' },
            take: 50,
            include: { user: { select: { name: true } } },
          })
        ).reverse();
    return {
      me: user.id,
      msgs: msgs.map((m) => ({
        id: m.id,
        uid: m.userId,
        name: m.user.name ?? 'Commander',
        text: m.text,
        at: m.createdAt.getTime(),
      })),
    };
  });

  app.post('/chat', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({ ch: z.enum(['global', 'clan']).default('global'), text: z.string().min(1).max(1000) })
      .parse(req.body ?? {});
    // control chars out, whitespace collapsed — chat is single-line
    // eslint-disable-next-line no-control-regex
    const text = body.text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LEN);
    if (!text) bad('Empty message');
    const now = new Date();
    let clanId: string | null = null;
    if (body.ch === 'clan') {
      const m = await myMembership(user.id);
      if (!m) bad('Join a clan to use its chat');
      clanId = m!.clanId;
    } else if ((await hallLvOf(user.id, now)) < 1) {
      bad('Build a Clan Hall to talk in the war room');
    }
    const last = lastMsgAt.get(user.id) ?? 0;
    if (now.getTime() - last < CHAT_COOLDOWN_S * 1000) bad('Easy, commander — one message every few seconds');
    lastMsgAt.set(user.id, now.getTime());
    const msg = await prisma().chatMessage.create({ data: { clanId, userId: user.id, text } });
    return {
      ok: true,
      msg: { id: msg.id, uid: user.id, name: user.name ?? 'Commander', text, at: msg.createdAt.getTime() },
    };
  });
}
