/**
 * GET    /api/v1/patients/{id}   — fetch single patient
 * PATCH  /api/v1/patients/{id}   — partial update
 * DELETE /api/v1/patients/{id}   — hard delete (cascades conversations + appts)
 *
 * Every operation is scoped to the auth token's clinic — a token from
 * Clinic A can't see/modify/delete patients of Clinic B (returns 404).
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import {
  verifyApiRequest,
  errorResponse,
  requireScope,
} from "@/server/api-auth";
import {
  checkApiRateLimit,
  serializePatient,
} from "@/server/v1-helpers";

const E164 = /^\+\d{8,15}$/;

const patchBody = z
  .object({
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().max(120).nullable().optional(),
    phone: z.string().trim().regex(E164).optional(),
    email: z.string().trim().toLowerCase().email().nullable().optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    source: z.string().trim().max(60).nullable().optional(),
    status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "patients:read");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: auth.ctx.clinicId },
  });
  if (!patient) {
    return errorResponse(404, "not_found", "Patient not found");
  }
  return NextResponse.json(serializePatient(patient));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "patients:write");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON");
  }
  const parsed = patchBody.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(422, "validation_failed", "Body failed validation", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // Confirm the row belongs to this clinic before mutating.
  const existing = await prisma.patient.findFirst({
    where: { id, clinicId: auth.ctx.clinicId },
    select: { id: true, phone: true },
  });
  if (!existing) {
    return errorResponse(404, "not_found", "Patient not found");
  }

  // If phone is changing, enforce per-clinic uniqueness.
  if (parsed.data.phone && parsed.data.phone !== existing.phone) {
    const conflict = await prisma.patient.findUnique({
      where: {
        clinicId_phone: {
          clinicId: auth.ctx.clinicId,
          phone: parsed.data.phone,
        },
      },
      select: { id: true },
    });
    if (conflict && conflict.id !== id) {
      return errorResponse(
        409,
        "already_exists",
        "Another patient in this clinic already uses that phone",
        { patientId: conflict.id },
      );
    }
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      ...(parsed.data.firstName !== undefined && { firstName: parsed.data.firstName }),
      ...(parsed.data.lastName !== undefined && { lastName: parsed.data.lastName }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
      ...(parsed.data.email !== undefined && { email: parsed.data.email }),
      ...(parsed.data.dob !== undefined && {
        dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      ...(parsed.data.source !== undefined && { source: parsed.data.source }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    },
  });

  await logAudit({
    clinicId: auth.ctx.clinicId,
    actorUserId: null,
    action: "patient.updated",
    target: `patient:${patient.id}`,
    metadata: {
      via: `api-token:${auth.ctx.token.name}`,
      tokenId: auth.ctx.token.id,
      changed: Object.keys(parsed.data),
    },
  });

  return NextResponse.json(serializePatient(patient));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "patients:write");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  const existing = await prisma.patient.findFirst({
    where: { id, clinicId: auth.ctx.clinicId },
    select: { id: true, firstName: true, phone: true },
  });
  if (!existing) {
    return errorResponse(404, "not_found", "Patient not found");
  }

  await prisma.patient.delete({ where: { id } });

  await logAudit({
    clinicId: auth.ctx.clinicId,
    actorUserId: null,
    action: "patient.deleted",
    target: `patient:${id}`,
    metadata: {
      via: `api-token:${auth.ctx.token.name}`,
      tokenId: auth.ctx.token.id,
      patientName: existing.firstName,
      patientPhone: existing.phone,
    },
  });

  return new NextResponse(null, { status: 204 });
}
