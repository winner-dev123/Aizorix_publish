/**
 * REST API authentication — token-based, per-clinic.
 *
 * External integrations (CRM connectors, mobile apps, partner systems)
 * authenticate by sending an `Authorization: Bearer azx_live_…` header.
 * The middleware here resolves the bearer token to a clinic and (optional)
 * scope set, or returns a structured `NextResponse` error the caller can
 * return verbatim.
 *
 * Token storage: only the SHA-256 hash sits in the DB. The raw token is
 * shown to the user once at creation and never recoverable — same model
 * as GitHub PATs, Stripe restricted keys, etc.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";

/** Live tokens issued in production. Sandbox tokens (future) would use
 *  `azx_test_` so they can't be confused with live ones in logs. */
const TOKEN_PREFIX = "azx_live_";
/** 32 random bytes → 43 base64url chars. With the prefix the full token
 *  is 52 chars, well over the 128-bit entropy floor for unguessability. */
const TOKEN_RANDOM_BYTES = 32;
/** First 12 chars of the raw token, shown in the UI to identify which
 *  token is which (e.g. "azx_live_a1b"). Safe to display — too short to
 *  brute-force in any practical sense given the remaining 31 bytes. */
const TOKEN_PREFIX_LENGTH = 12;

export interface ApiAuthContext {
  /** The clinic this request operates against. All downstream queries
   *  MUST filter by this id — same tenancy contract as session-based auth. */
  clinicId: string;
  /** The token record itself (id + scopes + name). The route handler
   *  can use the name in audit log metadata so the audit row reads
   *  "patient.created via api-token: HubSpot prod". */
  token: { id: string; name: string; scopes: string[] };
}

/** Distinguish the auth result so the route handler can `if (!auth.ok) return auth.response`. */
export type ApiAuthResult =
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; response: NextResponse };

/* ────────────────────────── Token generation ────────────────────────── */

/** Generate a new raw token. Caller is responsible for hashing+storing it
 *  via `hashToken()` and showing the raw value to the user exactly once. */
export function generateRawToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_RANDOM_BYTES).toString("base64url");
}

/** Hex-encoded SHA-256 of the raw token. Used as the DB lookup key. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** First N chars of the raw token, displayable in the UI alongside the
 *  token's name so the user can tell which row is which. */
export function tokenPrefix(raw: string): string {
  return raw.slice(0, TOKEN_PREFIX_LENGTH);
}

/* ───────────────────────────── Verification ───────────────────────────── */

/** Parse the `Authorization` header and return the raw bearer token, or
 *  null if missing / malformed. Accepts `Bearer ` (case-insensitive). */
function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  return token;
}

/**
 * Validate a request. Returns the clinic + token context on success, or
 * a `NextResponse` with a 401/403 the caller can return directly.
 *
 * Side effect: bumps `lastUsedAt` on the token record so the UI can
 * surface unused tokens for cleanup. Fire-and-forget — we don't await
 * because token verification must stay sub-ms.
 */
export async function verifyApiRequest(
  req: NextRequest,
): Promise<ApiAuthResult> {
  const raw = extractBearer(req);
  if (!raw) {
    return {
      ok: false,
      response: errorResponse(401, "missing_token", "Missing bearer token"),
    };
  }

  const hash = hashToken(raw);
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
    select: {
      id: true,
      name: true,
      scopes: true,
      clinicId: true,
      tokenHash: true,
      expiresAt: true,
    },
  });

  // Constant-time hash compare. findUnique already matched, but we
  // double-check with timingSafeEqual so a future change that uses
  // findFirst on partial fields doesn't open a timing oracle.
  if (!row) {
    return {
      ok: false,
      response: errorResponse(401, "invalid_token", "Invalid bearer token"),
    };
  }
  const a = Buffer.from(row.tokenHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return {
      ok: false,
      response: errorResponse(401, "invalid_token", "Invalid bearer token"),
    };
  }

  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      response: errorResponse(401, "token_expired", "Token has expired"),
    };
  }

  // Bump lastUsedAt. Fire-and-forget — a failure here must not block the
  // user's request, but we do log unexpected errors so they're visible.
  void prisma.apiToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch((e) => {
      console.error("[api-auth] failed to bump lastUsedAt", e);
    });

  return {
    ok: true,
    ctx: {
      clinicId: row.clinicId,
      token: { id: row.id, name: row.name, scopes: row.scopes },
    },
  };
}

/* ───────────────────────────── Error shape ───────────────────────────── */

/**
 * All API errors share the same shape so external clients can write a
 * single handler:
 *
 *   { "error": { "code": "invalid_token", "message": "…" } }
 *
 * Status codes follow REST convention:
 *   401 unauthenticated   — missing/invalid/expired token
 *   403 unauthorised      — scope missing
 *   404 not found         — resource doesn't exist OR caller can't see it
 *   409 conflict          — uniqueness violation (e.g. duplicate phone)
 *   422 validation failed — body fails schema validation
 *   429 rate limited      — too many requests
 *   500 internal          — bug; safe to retry idempotently
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(extra ?? {}) } },
    { status },
  );
}

/** Convenience for routes that need a specific scope. Scope checking is
 *  intentionally permissive in v1 (everyone has `full`); the structure is
 *  here so adding `patients:read` later is one line per route. */
export function requireScope(
  ctx: ApiAuthContext,
  scope: string,
): NextResponse | null {
  if (ctx.token.scopes.includes("full") || ctx.token.scopes.includes(scope)) {
    return null;
  }
  return errorResponse(403, "missing_scope", `Token is missing scope "${scope}"`);
}
