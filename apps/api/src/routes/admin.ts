/** P4: admin API (ban, balance adjust, overview). Admin = wallet matching ADMIN_WALLET env. */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma, type User } from '@warchest/db';
import { z } from 'zod';
import { requireUser } from './auth';

async function requireAdmin(req: FastifyRequest): Promise<User> {
  const user = await requireUser(req);
  if (!user.isAdmin) throw Object.assign(new Error('forbidden'), { statusCode: 403 });
  return user;
}

export function adminRoutes(app: FastifyInstance): void {
  app.get('/admin/overview', async (req) => {
    await requireAdmin(req);
    const db = prisma();
    const [users, villages, pendingClaims, battles] = await Promise.all([
      db.user.count(),
      db.village.count(),
      db.claim.count({ where: { status: 'pending' } }),
      db.battle.count({ where: { status: 'resolved' } }),
    ]);
    return { users, villages, pendingClaims, battles };
  });

  app.post('/admin/ban', async (req) => {
    await requireAdmin(req);
    const { userId, banned } = z.object({ userId: z.string(), banned: z.boolean() }).parse(req.body);
    await prisma().user.update({ where: { id: userId }, data: { banned } });
    return { ok: true };
  });

  app.post('/admin/adjust-war', async (req) => {
    const admin = await requireAdmin(req);
    const { userId, delta, note } = z
      .object({ userId: z.string(), delta: z.number().int(), note: z.string().max(200).optional() })
      .parse(req.body);
    const db = prisma();
    const v = await db.village.findUnique({ where: { userId } });
    if (!v) throw Object.assign(new Error('no village'), { statusCode: 404 });
    await db.village.update({ where: { id: v.id }, data: { war: Math.max(0, v.war + delta) } });
    await db.warLedger.create({
      data: { userId, delta, reason: 'admin', refId: `${admin.id}:${note ?? ''}`.slice(0, 190) },
    });
    return { ok: true };
  });
}
