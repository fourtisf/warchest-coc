#!/usr/bin/env bash
# Nightly PostgreSQL backup for WARCHEST (installed as /etc/cron.d/warchest-backup).
# Overridable for testing: WARCHEST_ENV=<env file> BACKUP_DIR=<dir> KEEP=<n>
set -euo pipefail
ENV_FILE="${WARCHEST_ENV:-/var/www/warchest/.env}"
DIR="${BACKUP_DIR:-/var/backups/warchest}"
KEEP="${KEEP:-14}"
set -a; . "$ENV_FILE"; set +a
mkdir -p "$DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$DIR/warchest-$STAMP.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$OUT"
# rotate: keep only the newest $KEEP dumps
ls -1t "$DIR"/warchest-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
