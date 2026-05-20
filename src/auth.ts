import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "@/server/db";
import authConfig from "./auth.config";

// The default PrismaAdapter assumes User.email is globally unique and calls
// `findUnique({ where: { email } })`. Our schema makes email unique only per
// clinic (`@@unique([clinicId, email])`), so we override the email lookup to
// use `findFirst`. Self-service signup is disabled — only seeded users sign in.
function aizorixAdapter() {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    getUserByEmail: async (email: string) => {
      const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), active: true },
      });
      return user ?? null;
    },
  };
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      clinicId: string;
      role: "OWNER" | "ADMIN" | "RECEPTIONIST" | "STAFF";
    } & DefaultSession["user"];
  }
}

type Role = "OWNER" | "ADMIN" | "RECEPTIONIST" | "STAFF";

/**
 * Full NextAuth (Auth.js v5) configuration.
 *
 * Sign-in is via email magic link. In dev (no SMTP_HOST) we override
 * `sendVerificationRequest` to log the link to the server console — copy it
 * from there into the browser to complete sign-in.
 *
 * Session strategy is JWT so the proxy/middleware can validate the cookie
 * on the edge without touching the database. The Prisma adapter still
 * tracks Users + Accounts; we just store sessions in the cookie itself.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: aizorixAdapter(),
  session: { strategy: "jwt" },
  providers: [
    Nodemailer({
      from: process.env.EMAIL_FROM ?? "no-reply@aizorix.dev",
      // Auth.js's Nodemailer provider validates `server` at construction time
      // (it throws if falsy). In dev (no SMTP_HOST) we override
      // sendVerificationRequest to log the link to the console and never
      // touch the transport, so this placeholder is never actually used.
      server: process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            auth:
              process.env.SMTP_USER && process.env.SMTP_PASSWORD
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
                : undefined,
          }
        : { host: "localhost", port: 25 },
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!process.env.SMTP_HOST) {
          // Dev fallback: print the magic link so you can sign in without SMTP.
          console.log(`\n[auth] Magic link for ${identifier}:\n    ${url}\n`);
          return;
        }
        const { createTransport } = await import("nodemailer");
        const transport = createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASSWORD
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
              : undefined,
        });
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM ?? "no-reply@aizorix.dev",
          subject: "Tu enlace para acceder a Aizorix",
          text: `Pulsa el enlace para iniciar sesión:\n${url}\n`,
        });
      },
    }),
  ],
  callbacks: {
    /**
     * Reject sign-in for emails that aren't already attached to an active
     * User row. Self-service signup isn't supported — only staff seeded by
     * the clinic owner can log in.
     */
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findFirst({
        where: { email: user.email, active: true },
      });
      return !!existing;
    },
    async jwt({ token, user }) {
      // First call (after sign-in) receives the freshly-resolved User. Cache
      // clinicId + role on the token so every later request can read it
      // without a DB round-trip.
      const t = token as typeof token & { clinicId?: string; role?: Role };
      if (user?.email && !t.clinicId) {
        const dbUser = await prisma.user.findFirst({
          where: { email: user.email, active: true },
          select: { id: true, clinicId: true, role: true },
        });
        if (dbUser) {
          t.sub = dbUser.id;
          t.clinicId = dbUser.clinicId;
          t.role = dbUser.role;
        }
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as { sub?: string; clinicId?: string; role?: Role };
      if (t.sub) session.user.id = t.sub;
      if (t.clinicId) session.user.clinicId = t.clinicId;
      if (t.role) session.user.role = t.role;
      return session;
    },
  },
});
