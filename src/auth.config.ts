import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config used by the proxy/middleware.
 *
 * Must not import Node-only modules (no nodemailer, no Prisma adapter).
 * Providers + adapter live in `auth.ts` which is imported only by server
 * components and route handlers (Node runtime).
 */
export default {
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
