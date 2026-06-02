/**
 * GET /api/v1/patients/{id}/export
 *
 * GDPR Art. 15 — right of access. Returns ALL personal data the system
 * holds about this patient, in a single JSON blob the data subject (or
 * the clinic on their behalf) can store, forward, or audit. The shape is
 * stable so it can also be used for the Art. 20 right of portability.
 *
 * Includes:
 *   • profile fields (name, phone, email, dob, notes, source, status)
 *   • appointments (past + future)
 *   • conversations + every message
 *   • AI memories the bot recorded about this patient
 *   • human handoff events
 *   • audit log entries that reference patient:{id}
 *
 * Excludes:
 *   • Clinic-wide settings, other patients' data, technicians' private
 *     records — strict tenant + subject scope.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { verifyApiRequest, errorResponse, requireScope } from "@/server/api-auth";
import { checkApiRateLimit } from "@/server/v1-helpers";

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

  const [appointments, conversations, memories, handoffs, audit] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { patientId: id, clinicId: auth.ctx.clinicId },
        orderBy: { startsAt: "asc" },
        include: {
          treatment: { select: { name: true, slug: true } },
          technician: { select: { name: true } },
        },
      }),
      prisma.conversation.findMany({
        where: { patientId: id, clinicId: auth.ctx.clinicId },
        orderBy: { createdAt: "asc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.aiMemory.findMany({
        where: { patientId: id, clinicId: auth.ctx.clinicId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.humanHandoff.findMany({
        where: { patientId: id, clinicId: auth.ctx.clinicId },
        orderBy: { openedAt: "asc" },
      }),
      prisma.auditLog.findMany({
        where: {
          clinicId: auth.ctx.clinicId,
          target: `patient:${id}`,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  await logAudit({
    clinicId: auth.ctx.clinicId,
    actorUserId: null,
    action: "patient.data_exported",
    target: `patient:${id}`,
    metadata: {
      via: `api-token:${auth.ctx.token.name}`,
      tokenId: auth.ctx.token.id,
    },
  });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    purpose: "GDPR Art. 15 — right of access",
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      dob: patient.dob ? patient.dob.toISOString().slice(0, 10) : null,
      gender: patient.gender,
      notes: patient.notes,
      source: patient.source,
      status: patient.status,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    },
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      notes: a.notes,
      treatment: a.treatment?.name ?? null,
      technician: a.technician?.name ?? null,
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      createdAt: c.createdAt.toISOString(),
      messages: c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
    aiMemories: memories.map((m) => ({
      id: m.id,
      key: m.key,
      value: m.value,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    handoffs: handoffs.map((h) => ({
      id: h.id,
      reason: h.reason,
      status: h.status,
      openedAt: h.openedAt.toISOString(),
      resolvedAt: h.resolvedAt?.toISOString() ?? null,
    })),
    auditLog: audit.map((a) => ({
      action: a.action,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
