import type { NextConfig } from "next";

/**
 * Response headers for the browser-facing app.
 *
 * The Content-Security-Policy is deliberately restrictive: no inline
 * scripts, no framing, and connections limited to the app's own origin plus
 * the API host. Styles need 'unsafe-inline' because Tailwind and the Next
 * font pipeline inject a <style> tag at runtime. In development,
 * 'unsafe-eval' is required for Next.js Fast Refresh and React hydration.
 */
const isDev = process.env.NODE_ENV !== "production";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // Product images are seller-supplied https references.
  `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Only meaningful once traffic is genuinely HTTPS; sending it earlier would
  // be harmful on a non-TLS host.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
