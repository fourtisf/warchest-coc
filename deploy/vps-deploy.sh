#!/usr/bin/env bash
# =============================================================================
# WARCHEST VPS deploy — warchest.fun  (v2: full stack)
#
#   1. (first run) removes the old "nivar" apps
#   2. installs Node 22 / pnpm / pm2 / nginx / certbot / PostgreSQL / Redis
#   3. provisions the warchest database + /var/www/warchest/.env
#   4. clones/updates the repo, installs, migrates, builds
#   5. PM2: warchest-web (:3000), warchest-api (:8787), warchest-worker
#   6. nginx vhost (/ → web, /api → api) + Let's Encrypt TLS
#
# Usage (as root on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/fourtisf/warchest-coc/claude/new-session-h7y22l/deploy/vps-deploy.sh | bash
# Optional env overrides: BRANCH, DOMAIN, CERT_EMAIL, TIME_SCALE, SKIP_NIVAR_CLEANUP=1
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/fourtisf/warchest-coc.git}"
BRANCH="${BRANCH:-claude/new-session-h7y22l}"
APP_DIR="${APP_DIR:-/var/www/warchest}"
DOMAIN="${DOMAIN:-warchest.fun}"
CERT_EMAIL="${CERT_EMAIL:-alfapangestu07@gmail.com}"
TIME_SCALE="${TIME_SCALE:-1}"
ENV_FILE="$APP_DIR/.env"

log()  { echo -e "\n\033[1;33m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- 1. nivar out
if [ "${SKIP_NIVAR_CLEANUP:-0}" != "1" ]; then
  log "Removing old nivar deployment (if present)"
  NIVAR_DIRS=""
  if command -v pm2 >/dev/null 2>&1; then
    NIVAR_DIRS=$(pm2 jlist 2>/dev/null | node -e '
      let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
        try {
          const apps=JSON.parse(s); const dirs=new Set();
          for (const a of apps) {
            if (!/nivar/i.test(a.name||"")) continue;
            const env=a.pm2_env||{};
            for (const p of [env.pm_cwd, env.cwd]) if (p && /nivar/i.test(p)) dirs.add(p);
          }
          console.log([...dirs].join("\n"));
        } catch {}
      });' 2>/dev/null || true)
    pm2 delete nivar-api >/dev/null 2>&1 || true
    pm2 delete nivar-web >/dev/null 2>&1 || true
    pm2 save --force >/dev/null 2>&1 || true
  fi
  for f in /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* /etc/nginx/conf.d/*.conf; do
    [ -e "$f" ] || continue
    if grep -qi nivar "$f" 2>/dev/null || [[ "$(basename "$f")" == *nivar* ]]; then
      echo "  removing nginx config: $f"; rm -f "$f"
    fi
  done
  for d in $NIVAR_DIRS /var/www/*nivar* /root/*nivar* /home/*/*nivar*; do
    if [ -d "$d" ] && [[ "$d" == *nivar* ]]; then
      echo "  deleting directory: $d"; rm -rf "$d"
    fi
  done
  ok "nivar cleanup done"
fi

# ------------------------------------------------------- 2. runtime packages
log "Checking Node.js / pnpm / nginx / certbot / postgres / redis"
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  [ "$MAJOR" -ge 20 ] && NEED_NODE=0
fi
if [ "$NEED_NODE" = "1" ]; then
  log "Installing Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pnpm >/dev/null 2>&1 || { corepack enable 2>/dev/null || npm i -g corepack; corepack prepare pnpm@10.33.0 --activate || npm i -g pnpm@10; }
command -v pm2  >/dev/null 2>&1 || npm i -g pm2
command -v git  >/dev/null 2>&1 || apt-get install -y git
command -v nginx >/dev/null 2>&1 || apt-get install -y nginx
command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx
command -v psql >/dev/null 2>&1 || apt-get install -y postgresql
command -v redis-server >/dev/null 2>&1 || apt-get install -y redis-server
systemctl enable --now postgresql >/dev/null 2>&1 || service postgresql start || true
systemctl enable --now redis-server >/dev/null 2>&1 || service redis-server start || true
ok "runtime ready: node $(node -v), pnpm $(pnpm -v)"

# ------------------------------------------------ 3. database + environment
log "Provisioning PostgreSQL + .env"
mkdir -p "$APP_DIR"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASS=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
  JWT=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 43)
  su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='warchest'\"" | grep -q 1 \
    || su postgres -c "psql -c \"CREATE USER warchest WITH PASSWORD '$DB_PASS';\""
  su postgres -c "psql -c \"ALTER USER warchest WITH PASSWORD '$DB_PASS';\""
  su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='warchest'\"" | grep -q 1 \
    || su postgres -c "createdb -O warchest warchest"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://warchest:$DB_PASS@localhost:5432/warchest
REDIS_URL=redis://localhost:6379
JWT_SECRET=$JWT
WARCHEST_DOMAIN=$DOMAIN
PORT=8787
TIME_SCALE=$TIME_SCALE
SOLANA_CLUSTER=devnet
HOT_WALLET_KEYPAIR=$APP_DIR/.keys/hot-wallet.json
CLAIM_MODE=mock
ADMIN_WALLET=
EOF
  chmod 600 "$ENV_FILE"
  ok ".env created (db password + JWT secret generated)"
else
  ok ".env exists — keeping it"
fi

# ----------------------------------------------------------- 4. fetch + build
log "Fetching WARCHEST ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR.tmp"
  cp -a "$APP_DIR.tmp/." "$APP_DIR/"
  rm -rf "$APP_DIR.tmp"
fi

log "Installing dependencies, migrating, building"
cd "$APP_DIR"
set -a; . "$ENV_FILE"; set +a
pnpm install --frozen-lockfile
pnpm --filter @warchest/db exec prisma generate
pnpm --filter @warchest/db exec prisma migrate deploy
pnpm --filter @warchest/web build
ok "build complete"

# ------------------------------------------------------------------- 5. PM2
log "Starting warchest-web / warchest-api / warchest-worker under PM2"
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
sleep 3
curl -fsS -o /dev/null http://127.0.0.1:3000/ && ok "web responding on :3000" \
  || { echo "web not responding"; pm2 logs warchest-web --lines 25 --nostream; exit 1; }
curl -fsS http://127.0.0.1:8787/api/health >/dev/null && ok "api responding on :8787" \
  || { echo "api not responding"; pm2 logs warchest-api --lines 25 --nostream; exit 1; }

# ------------------------------------------------------------------ 6. nginx
log "Installing nginx site for $DOMAIN"
install -m 644 "$APP_DIR/deploy/nginx-warchest.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
[ -L /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "nginx serving $DOMAIN"

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  log "Provisioning Let's Encrypt certificate"
  if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect; then
    ok "TLS active — https://$DOMAIN"
  else
    echo "⚠ certbot failed (DNS propagating?). Retry: certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect -m $CERT_EMAIL --agree-tos"
  fi
else
  certbot renew --quiet 2>/dev/null || true
  ok "TLS certificate already present"
fi

echo
ok "DONE — WARCHEST live at https://$DOMAIN  (game: /play)"
echo "   · Claims run in MOCK mode. To pay real devnet \$WAR:"
echo "       cd $APP_DIR && pnpm --filter @warchest/api setup:devnet $ENV_FILE && pm2 restart warchest-worker warchest-api"
echo "   · Admin: set ADMIN_WALLET=<your wallet> in $ENV_FILE, then pm2 restart warchest-api"
echo "   · Speed knob: TIME_SCALE in $ENV_FILE (1 = real CoC-style timers)"
pm2 list
