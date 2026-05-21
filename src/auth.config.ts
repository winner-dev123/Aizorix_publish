import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config used by the proxy/middleware.
 *
 * Must not import Node-only modules (no nodemailer, no Prisma adapter).
 * Providers + adapter live in `auth.ts` which is imported only by server
 * components and route handlers (Node runtime).
 */

const DEV_SECRET_FALLBACK =
  "dev-auth-secret-do-not-use-in-production-replace-with-openssl-rand-base64-32";

const isProduction = process.env.NODE_ENV === "production";
const envSecret = process.env.AUTH_SECRET?.trim();

// In dev, fall back to a stable dev-only string so a fresh checkout doesn't
// hit `MissingSecret` before the developer has run `openssl rand -base64 32`.
// In production, leave the secret undefined so NextAuth fails loudly — never
// silently use the fallback when something real is shipping.
const resolvedSecret = envSecret || (isProduction ? undefined : DEV_SECRET_FALLBACK);

if (!envSecret && !isProduction) {
  // Module-eval-time warning. Fires once per process boot, both in the edge
  // proxy runtime and the Node server runtime that imports this file.
  console.warn(
    "\n⚠️  [auth] AUTH_SECRET is not set — using an unsafe dev fallback.\n" +
      "    Generate a real one with: openssl rand -base64 32\n" +
      "    Then set AUTH_SECRET=... in .env and restart `npm run dev`.\n",
  );
}

export default {
  secret: resolvedSecret,
  pages: { signIn: "/signin" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isProtected = request.nextUrl.pathname.startsWith("/app");
      if (!isProtected) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
