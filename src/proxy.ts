import NextAuth from "next-auth";
import authConfig from "./auth.config";

/**
 * Edge proxy (Next.js 16's replacement for `middleware.ts`).
 *
 * Uses ONLY the edge-safe auth.config — no Prisma adapter, no nodemailer.
 * The `authorized` callback in auth.config decides whether to allow the
 * request; here we just wire it into the runtime.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/app/:path*"],
};
