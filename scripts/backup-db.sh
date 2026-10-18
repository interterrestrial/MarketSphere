#!/usr/bin/env bash
# ===========================================================================
# MarketSphere — PostgreSQL Backup Script
# ===========================================================================
# Creates a compressed logical dump of the production database.
#
# Prerequisites:
#   - pg_dump installed (comes with postgresql-client)
#   - DATABASE_URL environment variable set, or pass as argument
#
# Usage:
#   ./scripts/backup-db.sh                        # uses $DATABASE_URL
#   ./scripts/backup-db.sh "postgresql://..."      # explicit URL
#
# Output:
#   backups/marketsphere_YYYY-MM-DD_HHMMSS.sql.gz
# ===========================================================================

set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Error: No database URL provided."
  echo "  Set DATABASE_URL or pass it as an argument."
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/marketsphere_${TIMESTAMP}.sql.gz"

echo "▸ Backing up database to ${BACKUP_FILE}…"
pg_dump "$DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✓ Backup complete: ${BACKUP_FILE} (${SIZE})"

# Keep only the 10 most recent backups
cd "$BACKUP_DIR"
ls -1t marketsphere_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
echo "▸ Retained latest 10 backups."
