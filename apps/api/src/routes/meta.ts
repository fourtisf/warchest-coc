/** P4: season leaderboard (top 100 + around-me) and $WAR ledger. */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import { requireUser } from './auth';

const displayName = (wallet: string | null, id: string): string =>
  wallet ? wallet.slice(0, 4) + '…' + wallet.slice(-4) : 'Chief-' + id.slice(-4);

export function metaRoutes(app: FastifyInstance): void {
  app.get('/leaderboard', async (req) => {
    const user = await requireUser(req);
    const db = prisma();
    const top = await db.village.findMany({
      orderBy: [{ trophies: 'desc' }, { createdAt: 'asc' }],
      take: 100,
      include: { user: { select: { id: true, wallet: true, banned: true } } },
    });
    const rows = top
      .filter((v) => !v.user.banned)
      .map((v, i) => ({
        rank: i + 1,
        name: displayName(v.user.wallet, v.user.id),
        trophies: v.trophies,
        me: v.userId === user.id,
      }));
    let me = rows.find((r) => r.me) ?? null;
    if (!me) {
      const mine = await db.village.findUnique({ where: { userId: user.id } });
      if (mine) {
        const better = await db.village.count({ where: { trophies: { gt: mine.trophies } } });
        me = { rank: better + 1, name: 'You', trophies: mine.trophies, me: true };
      }
    }
    return { top: rows, me };
  });

  app.get('/ledger', async (req) => {
    const user = await requireUser(req);
    const rows = await prisma().warLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      entries: rows.map((r) => ({
        delta: r.delta,
        reason: r.reason,
        at: r.createdAt.getTime(),
      })),
    };
  });
}
