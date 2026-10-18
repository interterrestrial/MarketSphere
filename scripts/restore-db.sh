#!/usr/bin/env bash
# ===========================================================================
# MarketSphere — Restore database from backup
# ===========================================================================
# Restores a compressed SQL dump into the target database.
#
# Usage:
#   ./scripts/restore-db.sh backups/marketsphere_2026-10-18_120000.sql.gz
#   ./scripts/restore-db.sh backups/marketsphere_2026-10-18_120000.sql.gz "postgresql://..."
#
# ⚠️  This DROPS existing data. Always verify the target URL first.
# ===========================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
DB_URL="${2:-${DATABASE_URL:-}}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.sql.gz> [database-url]"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [[ -z "$DB_URL" ]]; then
  echo "Error: No database URL provided."
  echo "  Set DATABASE_URL or pass it as the second argument."
  exit 1
fi

echo ""
echo "⚠️  WARNING: This will DROP and recreate all data in:"
echo "   $DB_URL"
echo ""
read -p "Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

echo "▸ Restoring from ${BACKUP_FILE}…"
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"

echo "✓ Restore complete."
echo "▸ Run 'npx prisma migrate deploy' if you need to apply any newer migrations."
