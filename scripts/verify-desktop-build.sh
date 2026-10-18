#!/usr/bin/env bash
# ===========================================================================
# MarketSphere — Desktop Build Verification
# ===========================================================================
# Asserts that a packaged .app contains only the shell and nothing that could
# leak the server side of the marketplace.
#
# The desktop app talks to the deployed web application; it must never ship
# database credentials, server code, or environment files. This script is the
# check that enforces that, and it runs against the real build output rather
# than the source, so a packaging mistake cannot slip through.
#
# Usage:
#   ./scripts/verify-desktop-build.sh [path-to-.app]
#   defaults to release/mac-arm64/MarketSphere.app
# ===========================================================================

set -euo pipefail

APP_PATH="${1:-release/mac-arm64/MarketSphere.app}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Error: no app bundle at $APP_PATH"
  echo "  Build one first:  npm run electron:build"
  exit 1
fi

FAILURES=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAILURES=$((FAILURES + 1)); }

ASAR="$APP_PATH/Contents/Resources/app.asar"

echo "Verifying $APP_PATH"
echo

# ---------------------------------------------------------------------------
echo "1. Bundle contents"
# ---------------------------------------------------------------------------
# Expectations come from the electron-builder `files` list so this script
# cannot drift away from what is actually meant to ship. Only positive entries
# matter; the "!..." entries are exclusions.
# Bash 3.2 (the macOS default) has no `mapfile`, so read line by line.
EXPECTED_FILES=""
while IFS= read -r line; do
  EXPECTED_FILES="${EXPECTED_FILES}${line}
"
done < <(
  node -e "
    const pkg = require('./package.json');
    const files = pkg.build.files.filter((entry) => !entry.startsWith('!'));
    for (const entry of files) {
      // Expand a trailing '/**/*' into every matching source file.
      if (entry.endsWith('/**/*')) {
        const dir = entry.slice(0, -5);
        const walk = (d) => require('node:fs').readdirSync(d, { withFileTypes: true })
          .flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]));
        console.log(walk(dir).join('\n'));
      } else {
        console.log(entry);
      }
    }
  " 2>/dev/null | sed '/^$/d'
)

# asar lists directories without a trailing slash, so add the parents of every
# expected file rather than trying to infer which entries are directories.
EXPECTED_DIRS=$(printf '%s' "$EXPECTED_FILES" | sed 's|/[^/]*$||' | sort -u | grep -v "^${EXPECTED_FILES%%$'\n'*}$" || true)

ACTUAL_FILES=$(npx --no-install asar list "$ASAR" 2>/dev/null | sed 's|^/||' | grep -v '^$' | sort)

for file in $EXPECTED_FILES; do
  if echo "$ACTUAL_FILES" | grep -qx "$file"; then
    pass "contains $file"
  else
    fail "missing $file"
  fi
done

# `comm -23` reports lines present in the bundle but not in the allow-list.
UNEXPECTED=$(comm -23 \
  <(printf '%s\n' "$ACTUAL_FILES" | sort -u) \
  <(printf '%s\n' "${EXPECTED_FILES[@]}" "${EXPECTED_DIRS[@]}" | sort -u))
if [[ -z "$UNEXPECTED" ]]; then
  pass "ships nothing beyond the shell and its manifest"
else
  fail "unexpected files in the bundle:"
  echo "$UNEXPECTED" | sed 's/^/      /'
fi

# ---------------------------------------------------------------------------
echo
echo "2. No server secrets in the application code"
# ---------------------------------------------------------------------------
# Scans the asar only. The Electron framework binary legitimately contains the
# substrings "next" and "express" in its compiled output, which would otherwise
# produce meaningless matches.
for needle in DATABASE_URL AUTH_SECRET DIRECT_DATABASE_URL "postgresql://" "neon.tech" passwordHash "@prisma/client" bcryptjs STORAGE_SECRET_KEY; do
  # An asar archive stores its files verbatim, so a byte scan of the archive
  # is enough to catch a string that was packaged by mistake.
  if grep -qa -- "$needle" "$ASAR" 2>/dev/null; then
    fail "found '$needle' inside app.asar"
  else
    pass "no '$needle'"
  fi
done

# ---------------------------------------------------------------------------
echo
echo "3. No environment files or server directories"
# ---------------------------------------------------------------------------
STRAY=$(find "$APP_PATH/Contents/Resources" -maxdepth 2 \
  -name ".env*" -o -name "*.pem" -o -name "*.key" 2>/dev/null | head -5)
if [[ -z "$STRAY" ]]; then
  pass "no .env / .pem / .key files"
else
  fail "stray credential-capable files:"
  echo "$STRAY" | sed 's/^/      /'
fi

# ---------------------------------------------------------------------------
echo
echo "4. Bundle metadata"
# ---------------------------------------------------------------------------
PLIST="$APP_PATH/Contents/Info.plist"
check_plist() {
  local key="$1" expected="$2"
  local actual
  actual=$(/usr/libexec/PlistBuddy -c "Print $key" "$PLIST" 2>/dev/null || echo "")
  if [[ "$actual" == "$expected" ]]; then
    pass "$key = $actual"
  else
    fail "$key is '$actual', expected '$expected'"
  fi
}
check_plist "CFBundleIdentifier" "in.marketsphere.desktop"
check_plist "CFBundleName" "MarketSphere"
check_plist "LSApplicationCategoryType" "public.app-category.business"

# ---------------------------------------------------------------------------
echo
echo "5. Code signature"
# ---------------------------------------------------------------------------
SIGN_INFO=$(codesign -dv "$APP_PATH" 2>&1 || true)

if echo "$SIGN_INFO" | grep -q "Authority=Developer ID"; then
  pass "signed with a Developer ID certificate"
  if echo "$SIGN_INFO" | grep -q "flags=.*runtime"; then
    pass "hardened runtime enabled"
  else
    fail "hardened runtime is not enabled"
  fi
  if spctl -a -vvv "$APP_PATH" 2>&1 | grep -q "accepted"; then
    pass "accepted by Gatekeeper"
  else
    fail "Gatekeeper rejects this build — it is signed but not notarized"
  fi
elif echo "$SIGN_INFO" | grep -q "Signature=adhoc"; then
  # electron-builder falls back to an ad-hoc signature when no identity is
  # available. The app runs locally, but macOS will refuse to open it for
  # anyone else, and it carries none of the hardened-runtime guarantees.
  echo "  ! ad-hoc signature — runnable on this machine only, NOT distributable."
  echo "    For a release build set CSC_LINK (Developer ID certificate) and"
  echo "    APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID for notarization."
else
  echo "  ! unsigned build — fine for local testing, NOT distributable."
fi

echo
if [[ "$FAILURES" -eq 0 ]]; then
  echo "Desktop build verification PASSED"
  exit 0
fi
echo "Desktop build verification FAILED with $FAILURES problem(s)"
exit 1