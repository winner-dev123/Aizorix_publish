/**
 * POST /api/v1/patients
 *
 * Create a patient in the authenticated token's clinic. The first
 * resource exposed by the public REST API — paired with the Base Espejo
 * strategy, this is the endpoint a HubSpot / Pipedrive / Zoho connector
 * calls when it wants to push a new contact into Aizorix.
 *
 * Auth:    Authorization: Bearer azx_live_…  (see src/server/api-auth.ts)
 * Audit:   patients.created action, with `via: api-token: <name>`
 * Errors:  shared shape — { error: { code, message } } — see api-auth.ts
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { verifyApiRequest, errorResponse, requireScope } from "@/server/api-auth";
import {
  checkApiRateLimit,
  serializePatient,
} from "@/server/v1-helpers";

const E164 = /^\+\d{8,15}$/;

const createPatientBody = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().regex(E164),
  email: z.string().trim().toLowerCase().email().optional(),
  // ISO date string (YYYY-MM-DD) — we don't accept full ISO datetimes here
  // because patients are stored as a date-only field.
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Free-text note. Same length cap as the internal patient form. */
  notes: z.string().max(2000).optional(),
  /** External system label, surfaced in the CRM under "Origen". Defaults
   *  to "api" if the client doesn't provide one. */
  source: z.string().trim().max(60).optional(),
});

export async function POST(req: NextRequest) {
  // 1. Auth — Bearer azx_live_…
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "patients:write");
  if (scopeError) return scopeError;

  // 1b. Rate-limit per token.
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  // 2. Parse + validate body. Common content-type / JSON parse failures
  //    return 400 with a friendly message rather than the framework default.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON");
  }
  const parsed = createPatientBody.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(422, "validation_failed", "Body failed validation", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const { clinicId } = auth.ctx;

  // 3. Tenancy-safe dedupe by phone — phone is unique per clinic in the
  //    schema (@@unique([clinicId, phone])). Pre-check so we return a
  //    structured 409 instead of leaking a raw Prisma error.
  const existing = await prisma.patient.findUnique({
    where: { clinicId_phone: { clinicId, phone: parsed.data.phone } },
    select: { id: true },
  });
  if (existing) {
    return errorResponse(
      409,
      "already_exists",
      "A patient with this phone already exists in this clinic",
      { patientId: existing.id },
    );
  }

  // 4. Create.
  const patient = await prisma.patient.create({
    data: {
      clinicId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName ?? null,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      notes: parsed.data.notes ?? null,
      source: parsed.data.source ?? "api",
      status: "LEAD",
    },
  });

  // 5. Audit. The action label matches the internal `patient.created` so
  //    the audit view can group both surfaces; the `via` field tells the
  //    operator which token did it.
  await logAudit({
    clinicId,
    actorUserId: null,
    action: "patient.created",
    target: `patient:${patient.id}`,
    metadata: {
      via: `api-token:${auth.ctx.token.name}`,
      tokenId: auth.ctx.token.id,
      phone: parsed.data.phone,
      source: parsed.data.source ?? "api",
    },
  });

  return NextResponse.json(serializePatient(patient), { status: 201 });
}

/**
 * GET /api/v1/patients?q=…&status=…&limit=…&cursor=…
 *
 * Paginated list of patients in the authenticated token's clinic. Uses
 * cursor pagination (id-based) so an external sync job can iterate
 * without missing rows when new ones land mid-scan.
 *
 * Query params:
 *   q       — free-text search across name/phone/email (optional)
 *   status  — LEAD | ACTIVE | INACTIVE (optional filter)
 *   limit   — page size, max 100, default 50
 *   cursor  — id of the last row from the previous page (optional)
 */
const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "patients:read");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse(422, "validation_failed", "Invalid query params", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  const { q, status, limit, cursor } = parsed.data;
  const term = q?.trim();

  const where: import("@prisma/client").Prisma.PatientWhereInput = {
    clinicId: auth.ctx.clinicId,
    ...(status ? { status } : {}),
    ...(term
      ? {
          OR: [
            { firstName: { contains: term, mode: "insensitive" as const } },
            { lastName: { contains: term, mode: "insensitive" as const } },
            { phone: { contains: term } },
            { email: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Fetch limit+1 to determine whether a next page exists.
  const rows = await prisma.patient.findMany({
    where,
    orderBy: { id: "asc" },
    take: limit + 1,
    ...(cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {}),
  });

  const hasMore = rows.length > limit;
  const data = (hasMore ? rows.slice(0, limit) : rows).map(serializePatient);
  const nextCursor = hasMore ? rows[limit - 1].id : null;

  return NextResponse.json({ data, nextCursor, limit });
}
