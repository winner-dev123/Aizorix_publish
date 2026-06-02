/**
 * Shared helpers for /api/v1/* — request guard + rate limit + canonical
 * resource serializers.
 *
 * Every public endpoint should:
 *   1. const auth = await verifyApiRequest(req);
 *      if (!auth.ok) return auth.response;
 *   2. const rl = checkApiRateLimit(auth.ctx.token.id);
 *      if (!rl.ok) return rl.response;
 *   3. Do its thing.
 *
 * Centralising step 2 means we can change the rate-limit policy in one
 * place and every endpoint picks it up.
 */

import { NextResponse } from "next/server";
import { checkRateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/api-auth";
import type { Patient, Appointment, Treatment, Technician } from "@prisma/client";

/** Tokens carry a burst capacity of 120 req and refill at 2 req/sec
 * (≈120 req/min steady state). Generous enough for any typical CRM
 * sync, tight enough that a runaway integration can't melt the DB. */
const API_RATE_CAPACITY = 120;
const API_RATE_REFILL_PER_SEC = 2;

/**
 * Per-token rate limit. Returns `{ ok: true }` when allowed, or a 429
 * NextResponse when the bucket is empty. Call right after auth on every
 * `/api/v1/*` endpoint.
 */
export function checkApiRateLimit(tokenId: string):
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const allowed = checkRateLimit(
    `api-v1:${tokenId}`,
    API_RATE_CAPACITY,
    API_RATE_REFILL_PER_SEC,
  );
  if (allowed) return { ok: true };
  return {
    ok: false,
    response: errorResponse(
      429,
      "rate_limited",
      `Too many requests. Limit: ${API_RATE_CAPACITY} req burst @ ${API_RATE_REFILL_PER_SEC}/s per token.`,
    ),
  };
}

/* ───────────────────────── Serialisers ───────────────────────── */

export function serializePatient(p: Patient) {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    email: p.email,
    gender: p.gender,
    dob: p.dob ? p.dob.toISOString().slice(0, 10) : null,
    notes: p.notes,
    source: p.source,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeAppointment(
  a: Appointment & {
    patient?: { firstName: string; lastName: string | null; phone: string } | null;
    treatment?: { name: string; slug: string } | null;
    technician?: { name: string } | null;
  },
) {
  return {
    id: a.id,
    patientId: a.patientId,
    treatmentId: a.treatmentId,
    technicianId: a.technicianId,
    startAt: a.startsAt.toISOString(),
    endAt: a.endsAt.toISOString(),
    status: a.status,
    createdBy: a.createdBy,
    notes: a.notes,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    cancelReason: a.cancelReason,
    patient: a.patient
      ? {
          firstName: a.patient.firstName,
          lastName: a.patient.lastName,
          phone: a.patient.phone,
        }
      : undefined,
    treatment: a.treatment
      ? { name: a.treatment.name, slug: a.treatment.slug }
      : undefined,
    technician: a.technician ? { name: a.technician.name } : undefined,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function serializeTreatment(t: Treatment) {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    durationMinutes: t.durationMinutes,
    bufferMinutes: t.bufferMinutes,
    price: t.price ? t.price.toString() : null,
    showPrice: t.showPrice,
    priceType: t.priceType,
    priceNote: t.priceNote,
    requiresValuation: t.requiresValuation,
    genderApplicable: t.genderApplicable,
    active: t.active,
  };
}

export function serializeTechnician(t: Technician) {
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    color: t.color,
    prioritySensitive: t.prioritySensitive,
    active: t.active,
  };
}
