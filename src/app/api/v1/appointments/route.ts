/**
 * GET  /api/v1/appointments?from=…&to=…&technicianId=…&status=…
 * POST /api/v1/appointments
 *
 * Read + create appointments via the public API. The POST handler reuses
 * the internal transactional booking engine (`bookAppointment`) so
 * external integrations get the SAME safety guarantees the AI bot does:
 * no double-booking, lead-time validation, business-hours check, etc.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { verifyApiRequest, errorResponse, requireScope } from "@/server/api-auth";
import {
  checkApiRateLimit,
  serializeAppointment,
} from "@/server/v1-helpers";
import { bookAppointment } from "@/server/booking/book";
import { DomainError } from "@/server/errors";

/* ───────────────────────── GET list ───────────────────────── */

const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  technicianId: z.string().optional(),
  patientId: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "appointments:read");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    technicianId: url.searchParams.get("technicianId") ?? undefined,
    patientId: url.searchParams.get("patientId") ?? undefined,
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
  const { from, to, technicianId, patientId, status, limit, cursor } = parsed.data;

  const where: import("@prisma/client").Prisma.AppointmentWhereInput = {
    clinicId: auth.ctx.clinicId,
    ...(technicianId ? { technicianId } : {}),
    ...(patientId ? { patientId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          startsAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.appointment.findMany({
    where,
    orderBy: { startsAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      patient: { select: { firstName: true, lastName: true, phone: true } },
      treatment: { select: { name: true, slug: true } },
      technician: { select: { name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const data = (hasMore ? rows.slice(0, limit) : rows).map(serializeAppointment);
  const nextCursor = hasMore ? rows[limit - 1].id : null;

  return NextResponse.json({ data, nextCursor, limit });
}

/* ───────────────────────── POST create ───────────────────────── */

const createBody = z.object({
  patientId: z.string().min(1),
  treatmentId: z.string().min(1),
  technicianId: z.string().min(1),
  startsAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "appointments:write");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON");
  }
  const parsed = createBody.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(422, "validation_failed", "Body failed validation", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // Defence-in-depth: explicitly confirm every referenced row belongs to
  // the caller's clinic BEFORE calling bookAppointment. The booker also
  // checks, but failing fast here keeps the error message clear.
  const [patient, treatment, technician] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: parsed.data.patientId, clinicId: auth.ctx.clinicId },
      select: { id: true },
    }),
    prisma.treatment.findFirst({
      where: { id: parsed.data.treatmentId, clinicId: auth.ctx.clinicId },
      select: { id: true },
    }),
    prisma.technician.findFirst({
      where: { id: parsed.data.technicianId, clinicId: auth.ctx.clinicId },
      select: { id: true },
    }),
  ]);
  if (!patient || !treatment || !technician) {
    return errorResponse(
      404,
      "not_found",
      "patientId, treatmentId or technicianId not found in this clinic",
    );
  }

  try {
    const appt = await bookAppointment({
      clinicId: auth.ctx.clinicId,
      patientId: parsed.data.patientId,
      treatmentId: parsed.data.treatmentId,
      technicianId: parsed.data.technicianId,
      startsAt: new Date(parsed.data.startsAt),
      notes: parsed.data.notes,
      createdBy: "STAFF", // Closest semantic: external system acting on behalf of staff
    });

    await logAudit({
      clinicId: auth.ctx.clinicId,
      actorUserId: null,
      action: "appointment.created",
      target: `appointment:${appt.id}`,
      metadata: {
        via: `api-token:${auth.ctx.token.name}`,
        tokenId: auth.ctx.token.id,
        patientId: parsed.data.patientId,
        treatmentId: parsed.data.treatmentId,
        technicianId: parsed.data.technicianId,
      },
    });

    // Re-fetch with relations so the response carries human-readable
    // fields without a second round-trip from the caller.
    const enriched = await prisma.appointment.findUniqueOrThrow({
      where: { id: appt.id },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
        treatment: { select: { name: true, slug: true } },
        technician: { select: { name: true } },
      },
    });
    return NextResponse.json(serializeAppointment(enriched), { status: 201 });
  } catch (e) {
    // Map domain errors to HTTP status codes — never leak stack traces.
    if (e instanceof DomainError) {
      const status = e.code === "OVERLAP" ? 409 : 422;
      return errorResponse(status, e.code.toLowerCase(), e.message);
    }
    console.error("[/api/v1/appointments] book failed", e);
    return errorResponse(500, "internal_error", "Could not book the appointment");
  }
}
