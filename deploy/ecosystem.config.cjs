/**
 * PM2 process definitions for the WARCHEST VPS.
 * Env comes from /var/www/warchest/.env (written by deploy/vps-deploy.sh).
 */
const fs = require('fs');

function loadEnv(file) {
  const env = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
    }
  } catch {
    /* no .env yet */
  }
  return env;
}

const ENV = loadEnv('/var/www/warchest/.env');

module.exports = {
  apps: [
    {
      name: 'warchest-web',
      cwd: '/var/www/warchest/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      env: { NODE_ENV: 'production', ...ENV },
      max_memory_restart: '512M',
      autorestart: true,
    },
    {
      name: 'warchest-api',
      cwd: '/var/www/warchest/apps/api',
      // NOT node_modules/.bin/tsx — pnpm bin shims are shell scripts and PM2
      // would feed them to node. Point at tsx's real JS entry instead.
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/index.ts',
      env: { NODE_ENV: 'production', ...ENV },
      max_memory_restart: '512M',
      autorestart: true,
    },
    {
      name: 'warchest-worker',
      cwd: '/var/www/warchest/apps/api',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/worker.ts',
      env: { NODE_ENV: 'production', ...ENV },
      max_memory_restart: '256M',
      autorestart: true,
    },
  ],
};
