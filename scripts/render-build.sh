#!/usr/bin/env bash
# ===========================================================================
# MarketSphere — Render Build Script
# ===========================================================================
# Render runs this as the "Build Command" for the Express API service.
# It installs dependencies, generates the Prisma client, applies migrations,
# seeds the database with launch categories, and compiles TypeScript.
#
# Usage (Render dashboard → Build Command):
#   chmod +x scripts/render-build.sh && ./scripts/render-build.sh
# ===========================================================================

set -euo pipefail

echo "▸ Installing dependencies…"
npm ci --prefer-offline

echo "▸ Generating Prisma client…"
npx prisma generate

# Migrations run against the direct (non-pooler) endpoint when one is
# supplied: transaction poolers can reject the DDL Prisma needs.
MIGRATION_URL="${DIRECT_DATABASE_URL:-${DATABASE_URL:-}}"
echo "▸ Applying database migrations…"
DATABASE_URL="$MIGRATION_URL" npx prisma migrate deploy

echo "▸ Seeding launch categories (idempotent)…"
DATABASE_URL="$MIGRATION_URL" npm run db:seed

echo "▸ Build complete."
