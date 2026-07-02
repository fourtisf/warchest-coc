#!/usr/bin/env bash
# =============================================================================
# WARCHEST VPS deploy — warchest.fun
#
# What it does, in order:
#   1. Removes the old "nivar" apps (PM2 processes, nginx sites, app folders)
#   2. Ensures Node 20+ / pnpm / nginx / certbot are installed
#   3. Clones/updates this repo into /var/www/warchest and builds the web app
#   4. Starts it under PM2 (warchest-web on 127.0.0.1:3000) with boot persistence
#   5. Installs the nginx site for warchest.fun and provisions Let's Encrypt TLS
#
# Usage (as root on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/fourtisf/warchest-coc/claude/new-session-h7y22l/deploy/vps-deploy.sh | bash
# Optional env overrides: BRANCH, DOMAIN, CERT_EMAIL, SKIP_NIVAR_CLEANUP=1
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/fourtisf/warchest-coc.git}"
BRANCH="${BRANCH:-claude/new-session-h7y22l}"
APP_DIR="${APP_DIR:-/var/www/warchest}"
DOMAIN="${DOMAIN:-warchest.fun}"
CERT_EMAIL="${CERT_EMAIL:-alfapangestu07@gmail.com}"

log()  { echo -e "\n\033[1;33m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- 1. nivar out
if [ "${SKIP_NIVAR_CLEANUP:-0}" != "1" ]; then
  log "Removing old nivar deployment"

  # capture nivar app directories from PM2 before deleting the processes
  NIVAR_DIRS=""
  if command -v pm2 >/dev/null 2>&1; then
    NIVAR_DIRS=$(pm2 jlist 2>/dev/null | node -e '
      let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
        try {
          const apps=JSON.parse(s);
          const dirs=new Set();
          for (const a of apps) {
            if (!/nivar/i.test(a.name||"")) continue;
            const env=a.pm2_env||{};
            for (const p of [env.pm_cwd, env.cwd]) if (p && /nivar/i.test(p)) dirs.add(p);
          }
          console.log([...dirs].join("\n"));
        } catch { /* no pm2 apps */ }
      });' 2>/dev/null || true)
    pm2 delete nivar-api >/dev/null 2>&1 || true
    pm2 delete nivar-web >/dev/null 2>&1 || true
    pm2 save --force >/dev/null 2>&1 || true
    ok "PM2: nivar-api & nivar-web removed"
  fi

  # nginx sites that mention nivar
  for f in /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* /etc/nginx/conf.d/*.conf; do
    [ -e "$f" ] || continue
    if grep -qi nivar "$f" 2>/dev/null || [[ "$(basename "$f")" == *nivar* ]]; then
      echo "  removing nginx config: $f"
      rm -f "$f"
    fi
  done

  # app folders: whatever PM2 pointed at + common locations (nivar-named only)
  for d in $NIVAR_DIRS /var/www/*nivar* /root/*nivar* /home/*/*nivar*; do
    if [ -d "$d" ] && [[ "$d" == *nivar* ]]; then
      echo "  deleting directory: $d"
      rm -rf "$d"
    fi
  done
  ok "nivar cleanup done"
fi

# ------------------------------------------------------- 2. runtime packages
log "Checking Node.js / pnpm / nginx / certbot"
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
ok "node $(node -v), pnpm $(pnpm -v), pm2 $(pm2 -v 2>/dev/null | tail -1)"

# ----------------------------------------------------------- 3. fetch + build
log "Fetching WARCHEST ($BRANCH)"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
else
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi

log "Installing dependencies + building web"
cd "$APP_DIR"
pnpm install --frozen-lockfile
pnpm --filter @warchest/web build
ok "build complete"

# ------------------------------------------------------------------- 4. PM2
log "Starting warchest-web under PM2"
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
sleep 2
curl -fsS -o /dev/null http://127.0.0.1:3000/ && ok "web responding on 127.0.0.1:3000" \
  || { echo "web not responding on :3000"; pm2 logs warchest-web --lines 30 --nostream; exit 1; }

# ------------------------------------------------------------------ 5. nginx
log "Installing nginx site for $DOMAIN"
install -m 644 "$APP_DIR/deploy/nginx-warchest.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
# drop the stock default site so $DOMAIN is the primary vhost
[ -L /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "nginx serving $DOMAIN on :80"

log "Provisioning Let's Encrypt certificate"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect; then
  ok "TLS active — https://$DOMAIN"
else
  echo "⚠ certbot failed (DNS may still be propagating). Site stays on http for now."
  echo "  Retry later with: certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect -m $CERT_EMAIL --agree-tos"
fi

echo
ok "DONE — WARCHEST live at http(s)://$DOMAIN  (game: /play)"
pm2 list
