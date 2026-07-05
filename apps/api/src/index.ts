/** WARCHEST API — Fastify server, mounted under /api (nginx proxies warchest.fun/api → :8787). */
import fastifyCookie from '@fastify/cookie';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { ENV } from './env';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { battleRoutes } from './routes/battle';
import { claimRoutes } from './routes/claim';
import { clanRoutes } from './routes/clan';
import { metaRoutes } from './routes/meta';
import { pushRoutes } from './routes/push';
import { villageRoutes } from './routes/village';

const app = Fastify({ logger: true });

await app.register(fastifyCookie);

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof ZodError)
    return reply.code(400).send({ error: 'invalid request', issues: err.issues });
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  return reply.code(status).send({ error: err.message });
});

await app.register(
  async (api) => {
    api.get('/health', async () => ({ ok: true, service: 'warchest-api', now: Date.now() }));
    authRoutes(api);
    villageRoutes(api);
    battleRoutes(api);
    claimRoutes(api);
    clanRoutes(api);
    metaRoutes(api);
    pushRoutes(api);
    adminRoutes(api);
  },
  { prefix: '/api' },
);

app
  .listen({ port: ENV.PORT, host: '127.0.0.1' })
  .then(() => app.log.info(`warchest-api on :${ENV.PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
