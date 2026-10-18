/**
 * Navigation policy for the desktop shell.
 *
 * The shell is a window onto the web application, not a second copy of it.
 * Every URL that reaches the renderer has to pass through this module, and the
 * rules are deliberately strict:
 *
 *   - only the configured application origin may be loaded or navigated to;
 *   - anything else is handed to the operating system browser, never opened
 *     inside the app;
 *   - non-web schemes (`javascript:`, `data:`, `file:`, `blob:`) are refused
 *     outright, because the renderer must never be able to navigate itself
 *     into executing or reading local content;
 *   - external URLs carrying embedded credentials are stripped before they are
 *     handed over, since `https://user:pass@host` is a phishing primitive.
 *
 * The module is plain CommonJS with no Electron imports, so the rules can be
 * unit-tested directly instead of only being exercised by hand.
 */

"use strict";

/** Deployed web application. Overridden at build time / by MARKETSPHERE_APP_URL. */
const DEFAULT_APP_URL = "https://marketsphere.vercel.app";

/** Origin used by `npm run electron:dev`, where the web app runs locally. */
const DEV_APP_URL = "http://localhost:3000";

/** Schemes the shell is willing to hand to the system browser. */
const EXTERNAL_SCHEMES = new Set(["http:", "https:"]);

/** Parse without throwing. */
function parse(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Normalised origin of the application URL, e.g. `https://app.example.com`.
 * Returns null when the configured value is unusable.
 */
function appOrigin(configured) {
  const url = parse(configured);
  return url ? url.origin : null;
}

/**
 * True when `candidate` is the application itself.
 *
 * Compared as a parsed origin rather than by string prefix: a prefix check
 * would accept `https://marketsphere.vercel.app.evil.example`, which is a
 * complete look-alike domain.
 */
function isAppUrl(candidate, origin) {
  const url = parse(candidate);
  const target = appOrigin(origin);
  if (!url || !target) return false;
  return url.origin === target;
}

/**
 * Normalise a URL for `shell.openExternal`.
 *
 * Returns null for anything that is not a plain web URL, and strips embedded
 * credentials. Returning the normalised string (rather than a boolean) means
 * the caller cannot accidentally forward the raw, unvalidated value.
 */
function sanitizeExternalUrl(candidate) {
  const url = parse(candidate);
  if (!url || !EXTERNAL_SCHEMES.has(url.protocol)) return null;
  if (!url.hostname) return null;

  url.username = "";
  url.password = "";
  return url.toString();
}

/** True when the URL must never be loaded, in any window. */
function isBlockedUrl(candidate) {
  const url = parse(candidate);
  if (!url) return true;
  return !EXTERNAL_SCHEMES.has(url.protocol);
}

module.exports = {
  DEFAULT_APP_URL,
  DEV_APP_URL,
  EXTERNAL_SCHEMES,
  appOrigin,
  isAppUrl,
  isBlockedUrl,
  sanitizeExternalUrl,
};
