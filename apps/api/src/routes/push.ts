/** Web Push subscription management. The client subscribes from Settings. */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import { z } from 'zod';
import { ENV } from '../env';
import { requireUser } from './auth';

export function pushRoutes(app: FastifyInstance): void {
  // public VAPID key ('' when push isn't configured — client hides the toggle)
  app.get('/push/key', async () => ({ key: ENV.VAPID_PUBLIC_KEY }));

  app.post('/push/subscribe', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({
        endpoint: z.string().url().max(600),
        keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
      })
      .parse(req.body);
    await prisma().pushSub.upsert({
      where: { endpoint: body.endpoint },
      update: { userId: user.id, p256dh: body.keys.p256dh, auth: body.keys.auth, failCount: 0 },
      create: { userId: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return { ok: true };
  });

  app.post('/push/unsubscribe', async (req) => {
    const user = await requireUser(req);
    const { endpoint } = z.object({ endpoint: z.string().max(600) }).parse(req.body);
    await prisma().pushSub.deleteMany({ where: { endpoint, userId: user.id } });
    return { ok: true };
  });
}
