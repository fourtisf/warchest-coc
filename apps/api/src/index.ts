/**
 * WARCHEST API — P0 stub.
 * P1 brings SIWS auth, Prisma models and server-authoritative village actions;
 * P2 adds deploy-log battle validation via @warchest/game-core simulateBattle().
 */
import Fastify from 'fastify';
import { QUEST_POOL, simulateBattle } from '@warchest/game-core';

const app = Fastify({ logger: true });

app.get('/health', async () => ({
  ok: true,
  service: 'warchest-api',
  questPool: QUEST_POOL,
  // proves the shared sim is importable server-side from day one
  simShared: typeof simulateBattle === 'function',
}));

const port = Number(process.env.PORT ?? 8787);
app
  .listen({ port, host: '0.0.0.0' })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
