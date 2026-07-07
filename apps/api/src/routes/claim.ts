/** P3: $WAR claims — off-chain ledger is canonical; the worker pays out on-chain. */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import { z } from 'zod';
import { ENV } from '../env';
import { materializeVillage, statOf } from '../materialize';
import { keepLv } from '../rules';
import { serializeVillage } from '../serialize';
import { bumpDaily, getDaily, store } from '../store';
import { requireUser } from './auth';

export function claimRoutes(app: FastifyInstance): void {
  app.post('/claim', async (req, reply) => {
    const user = await requireUser(req);
    const { amount } = z.object({ amount: z.number().int().positive() }).parse(req.body);
    if (!user.wallet) return reply.code(400).send({ error: 'Connect a wallet first' });
    if (amount < ENV.CLAIM_MIN)
      return reply.code(400).send({ error: `Minimum claim is ◆${ENV.CLAIM_MIN}` });
    const lockKey = `wc:claimlock:${user.id}`;
    if (await store().get(lockKey))
      return reply.code(429).send({ error: 'One claim per hour — try again later' });
    const today = await getDaily('claim', user.id);
    if (today + amount > ENV.CLAIM_DAILY_CAP)
      return reply.code(400).send({ error: `Daily claim cap is ◆${ENV.CLAIM_DAILY_CAP}` });

    const now = new Date();
    const v = await materializeVillage(user.id, now);
    if (v.war < amount) return reply.code(400).send({ error: 'Not enough $WAR' });
    if (keepLv(v.buildings) < ENV.CLAIM_MIN_KEEP)
      return reply
        .code(400)
        .send({ error: `Claims unlock at Keep Level ${ENV.CLAIM_MIN_KEEP}` });
    const ageH = (now.getTime() - user.createdAt.getTime()) / 3600e3;
    if (ageH < ENV.CLAIM_MIN_AGE_H)
      return reply.code(400).send({
        error: `Claims unlock ${ENV.CLAIM_MIN_AGE_H}h after your village is founded`,
      });

    const db = prisma();
    // multi-account guard: a network of alts can't fan out claims all day
    if (user.ipHash) {
      const siblings = await db.user.findMany({
        where: { ipHash: user.ipHash, id: { not: user.id } },
        select: { id: true },
      });
      if (siblings.length) {
        const dayStart = new Date(now);
        dayStart.setUTCHours(0, 0, 0, 0);
        const n = await db.claim.count({
          where: {
            userId: { in: [user.id, ...siblings.map((s) => s.id)] },
            createdAt: { gte: dayStart },
          },
        });
        if (n >= 3)
          return reply
            .code(429)
            .send({ error: 'Too many claims from this network today — try again tomorrow' });
      }
    }
    const fee = Math.floor((amount * ENV.CLAIM_FEE_BPS) / 10000);
    v.war -= amount;
    await db.village.update({ where: { id: v.id }, data: { war: v.war } });
    const claim = await db.claim.create({
      data: { userId: user.id, amount, fee, wallet: user.wallet },
    });
    await db.warLedger.create({
      data: { userId: user.id, delta: -amount, reason: 'claim', refId: claim.id },
    });
    const stat = statOf(v);
    stat.claims += 1;
    stat.warClaimed += amount;
    await db.village.update({ where: { id: v.id }, data: { statJson: stat as object } });
    await store().setex(lockKey, 3600, '1');
    await bumpDaily('claim', user.id, amount);

    const fresh = await materializeVillage(user.id, now);
    return {
      claim: { id: claim.id, amount, fee, status: claim.status },
      village: serializeVillage(fresh, user, now),
    };
  });

  app.get('/claims', async (req) => {
    const user = await requireUser(req);
    const rows = await prisma().claim.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      claims: rows.map((c) => ({
        id: c.id,
        amount: c.amount,
        fee: c.fee,
        status: c.status,
        txSig: c.txSig,
        at: c.createdAt.getTime(),
      })),
    };
  });
}
