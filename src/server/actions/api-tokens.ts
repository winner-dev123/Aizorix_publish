"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import {
  generateRawToken,
  hashToken,
  tokenPrefix,
} from "@/server/api-auth";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: { code: string; message: string } }
  : { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const createTokenSchema = z.object({
  name: z.string().trim().min(1, "Nombre obligatorio").max(80),
  /** Days until expiry. 0 means no expiry. Defaults to 90. */
  expiresInDays: z.number().int().min(0).max(3650).default(90),
});

export type CreateApiTokenInput = z.input<typeof createTokenSchema>;

/**
 * Mint a new API token for the caller's clinic. Returns the RAW token
 * exactly once — never recoverable later. The UI shows it once with a
 * "copy to clipboard" affordance.
 *
 * Access: any OWNER / ADMIN of the clinic. RECEPTIONIST and STAFF are
 * rejected — tokens grant full clinic data access and should be tightly
 * controlled.
 */
export async function createApiTokenAction(
  input: CreateApiTokenInput,
): Promise<ActionResult<{ raw: string; tokenId: string; prefix: string; expiresAt: string | null }>> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Solo OWNER y ADMIN pueden gestionar tokens API",
      },
    };
  }

  const parsed = createTokenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const raw = generateRawToken();
  const expiresAt =
    parsed.data.expiresInDays > 0
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const created = await prisma.apiToken.create({
    data: {
      clinicId: session.user.clinicId,
      tokenHash: hashToken(raw),
      prefix: tokenPrefix(raw),
      name: parsed.data.name,
      scopes: ["full"],
      expiresAt,
      createdByUserId: session.user.id,
    },
    select: { id: true, prefix: true, expiresAt: true },
  });

  await logAudit({
    clinicId: session.user.clinicId,
    actorUserId: session.user.id,
    action: "api_token.created",
    target: `api_token:${created.id}`,
    metadata: {
      name: parsed.data.name,
      expiresAt: expiresAt?.toISOString() ?? null,
    },
  });

  revalidatePath("/app/settings/api");
  return {
    ok: true,
    data: {
      raw,
      tokenId: created.id,
      prefix: created.prefix,
      expiresAt: created.expiresAt?.toISOString() ?? null,
    },
  };
}

/**
 * Revoke (= delete) a token. Idempotent — deleting a token that's
 * already gone returns ok. Token is scoped to caller's clinic so a
 * malicious user can't revoke another tenant's tokens.
 */
export async function revokeApiTokenAction(
  tokenId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Solo OWNER y ADMIN pueden gestionar tokens API",
      },
    };
  }

  const existing = await prisma.apiToken.findFirst({
    where: { id: tokenId, clinicId: session.user.clinicId },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: true };

  await prisma.apiToken.delete({ where: { id: existing.id } });

  await logAudit({
    clinicId: session.user.clinicId,
    actorUserId: session.user.id,
    action: "api_token.revoked",
    target: `api_token:${existing.id}`,
    metadata: { name: existing.name },
  });

  revalidatePath("/app/settings/api");
  return { ok: true };
}
