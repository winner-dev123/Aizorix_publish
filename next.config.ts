import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * CSP is deliberately permissive on `script-src` / `style-src` because
 * Next.js inlines hydration scripts + Tailwind CSS variables. Tightening
 * to nonces would require server-side nonce generation per request and
 * threading them through every <Script>. Acceptable trade-off for now;
 * `frame-ancestors 'none'` + `object-src 'none'` already prevent the
 * most common attacks (clickjacking, Flash/plugin injection).
 *
 * Allow-listed external origins:
 *   - images.unsplash.com / images.pexels.com — landing imagery
 *   - api.openai.com                          — direct calls from server only (in CSP for completeness)
 *   - data: / blob:                           — image previews + file upload preview
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.openai.com https://*.neon.tech wss://*.neon.tech",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.170.129"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  async headers() {
    return [
      {
        // Everything except the public REST API (which sets its own CORS
        // headers if/when we open it cross-origin).
        source: "/((?!api/v1).*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
