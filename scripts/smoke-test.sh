#!/usr/bin/env bash
# ===========================================================================
# MarketSphere — Production Smoke Test
# ===========================================================================
# Hits key endpoints on a deployed instance to verify they respond correctly.
#
# Usage:
#   ./scripts/smoke-test.sh https://marketsphere.vercel.app https://marketsphere-api.onrender.com
# ===========================================================================

set -euo pipefail

FRONTEND_URL="${1:-}"
API_URL="${2:-}"

if [[ -z "$FRONTEND_URL" || -z "$API_URL" ]]; then
  echo "Usage: $0 <frontend-url> <api-url>"
  echo "  Example: $0 https://marketsphere.vercel.app https://marketsphere-api.onrender.com"
  exit 1
fi

PASS=0
FAIL=0

check() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "$expected_status" ]]; then
    echo "  ✅ ${label} → ${STATUS}"
    PASS=$((PASS + 1))
  else
    echo "  ❌ ${label} → ${STATUS} (expected ${expected_status})"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   MarketSphere Production Smoke Test  ║"
echo "╚═══════════════════════════════════════╝"
echo ""

echo "▸ Frontend (${FRONTEND_URL})"
check "Homepage loads"               "${FRONTEND_URL}/"
check "Login page"                   "${FRONTEND_URL}/login"
check "Products page"                "${FRONTEND_URL}/products"
check "Health API (Next.js)"         "${FRONTEND_URL}/api/health"

echo ""
echo "▸ Express API (${API_URL})"
check "Health check"                 "${API_URL}/api/health"
check "Auth login endpoint exists"   "${API_URL}/api/v1/auth/login" "405"
check "Products listing"             "${API_URL}/api/v1/products"

echo ""
echo "▸ Security headers"
HEADERS=$(curl -s -I --max-time 10 "${API_URL}/api/health" 2>/dev/null)
for HEADER in "X-Content-Type-Options" "X-Frame-Options" "Content-Security-Policy"; do
  if echo "$HEADERS" | grep -qi "$HEADER"; then
    echo "  ✅ ${HEADER} present"
    PASS=$((PASS + 1))
  else
    echo "  ❌ ${HEADER} missing"
    FAIL=$((FAIL + 1))
  fi
done

# Check HSTS in production
if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
  echo "  ✅ HSTS header present"
  PASS=$((PASS + 1))
else
  echo "  ⚠️  HSTS header missing (expected in production)"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "══════════════════════════════════════════"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "══════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
echo "  🎉 All checks passed!"
