#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/church-flow}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.dump"

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_HOST:?POSTGRES_HOST is required}"

mkdir -p "$BACKUP_DIR"

pg_dump \
  --host="$POSTGRES_HOST" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE"

# Prune old backups
find "$BACKUP_DIR" -name "postgres_*.dump" -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: $BACKUP_FILE"
