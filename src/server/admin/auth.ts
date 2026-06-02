/**
 * Platform admin authentication — separate from the clinic user session.
 *
 * Surface:
 *   hashPassword(plain)        → "<salt-hex>:<key-hex>"
 *   verifyPassword(plain, db)  → boolean (constant-time)
 *   issueAdminCookie(id, res)  → set-cookie that survives 24h
 *   clearAdminCookie(res)
 *   getPlatformAdmin()         → fetches the admin from the cookie or null
 *   requirePlatformAdmin()     → server helper; redirects to /admin/signin
 *
 * Cookie shape: `aizorix_admin = <adminId>.<hmac-sha256(adminId, AUTH_SECRET)>`
 * — signed so the server can trust it without a per-request DB lookup, and
 * the signature is keyed to `AUTH_SECRET` (already required by NextAuth).
 *
 * SECURITY NOTES
 *   - Passwords use Node's scrypt. No external deps; FIPS-equivalent params.
 *   - The cookie is HttpOnly + Secure (in prod) + SameSite=Lax.
 *   - On every request we re-fetch the admin row from the DB and check
 *     `active` — disabling a row via DB takes effect on the NEXT request.
 *   - HMAC comparison is constant-time (timingSafeEqual). Hash comparison
 *     in verifyPassword() is also constant-time.
 */

import { randomBytes, scrypt, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";

const COOKIE_NAME = "aizorix_admin";
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24h sliding expiry

/* ─────────────────────────── password hashing ─────────────────────────── */

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((res, rej) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err) rej(err);
      else res(derived);
    });
  });
}

/** Hash a plaintext password to the storage format used in
 *  `PlatformAdmin.passwordHash`. Returns "<salt-hex>:<key-hex>". */
export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const derived = await scryptAsync(plain, salt);
  return `${salt}:${derived.toString("hex")}`;
}

/** Constant-time verify a candidate password against a stored hash. */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const salt = stored.slice(0, sep);
  const hashHex = stored.slice(sep + 1);
  let storedBytes: Buffer;
  try {
    storedBytes = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (storedBytes.length !== SCRYPT_KEYLEN) return false;
  const derived = await scryptAsync(plain, salt);
  if (derived.length !== storedBytes.length) return false;
  return timingSafeEqual(derived, storedBytes);
}

/* ─────────────────────────── cookie signing ─────────────────────────── */

function authSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) {
    throw new Error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) is required for platform-admin sessions",
    );
  }
  return s;
}

function sign(id: string): string {
  const mac = createHmac("sha256", authSecret()).update(id).digest("base64url");
  return `${id}.${mac}`;
}

function verify(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const id = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!id || !mac) return null;
  const expected = createHmac("sha256", authSecret())
    .update(id)
    .digest("base64url");
  if (mac.length !== expected.length) return null;
  let aBuf: Buffer;
  let bBuf: Buffer;
  try {
    aBuf = Buffer.from(mac);
    bBuf = Buffer.from(expected);
  } catch {
    return null;
  }
  if (aBuf.length !== bBuf.length) return null;
  if (!timingSafeEqual(aBuf, bBuf)) return null;
  return id;
}

/* ─────────────────────────── cookie operations ─────────────────────────── */

export async function issueAdminCookie(adminId: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: sign(adminId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/* ─────────────────────────── session resolution ─────────────────────────── */

export interface PlatformAdminSession {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Returns the platform admin attached to the current request, or null if
 * unauthenticated. Does a DB lookup so deactivating an admin row takes
 * effect on the next request without waiting for the cookie to expire.
 */
export async function getPlatformAdmin(): Promise<PlatformAdminSession | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) return null;
  const adminId = verify(cookie.value);
  if (!adminId) return null;
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, active: true },
  });
  if (!admin || !admin.active) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

/**
 * Server-component / server-action guard. Redirects to /admin/signin if
 * the request doesn't carry a valid admin session.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const admin = await getPlatformAdmin();
  if (!admin) {
    redirect("/admin/signin");
  }
  return admin;
}
