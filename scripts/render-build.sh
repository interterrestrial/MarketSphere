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

echo "▸ Applying database migrations…"
npx prisma migrate deploy

echo "▸ Seeding launch categories (idempotent)…"
npm run db:seed

echo "▸ Build complete."
