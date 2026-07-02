/**
 * PM2 process definitions for the WARCHEST VPS.
 * P0: web only. P1+ adds `warchest-api` and `warchest-worker` here.
 */
module.exports = {
  apps: [
    {
      name: 'warchest-web',
      cwd: '/var/www/warchest/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
        WARCHEST_DOMAIN: 'warchest.fun',
      },
      max_memory_restart: '512M',
      autorestart: true,
    },
  ],
};
