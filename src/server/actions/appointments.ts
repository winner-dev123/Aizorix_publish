"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { bookAppointment } from "@/server/booking/book";
import { cancelAppointment } from "@/server/booking/cancel";
import { rescheduleAppointment } from "@/server/booking/reschedule";
import { isDomainError } from "@/server/errors";
import { getWhatsAppProvider } from "@/server/whatsapp";
import { incr } from "@/server/metrics";
import { logAudit } from "@/server/audit";

type ActionResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } };

/**
 * Cancel an appointment from the dashboard. Re-uses the same Serializable
 * transaction the bot uses so manual cancellations follow identical rules.
 */
export async function cancelAppointmentAction(
  appointmentId: string,
  reason?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  try {
    await cancelAppointment({
      appointmentId,
      clinicId: session.user.clinicId,
      reason: reason ?? "Cancelado desde panel",
    });
    await logAudit({
      clinicId: session.user.clinicId,
      actorUserId: session.user.id,
      action: "appointment.cancelled",
      target: `appointment:${appointmentId}`,
      metadata: { reason: reason ?? "Cancelado desde panel" },
    });
    revalidatePath("/app/agenda");
    return { ok: true };
  } catch (err) {
    if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message } };
    return { ok: false, error: { code: "UNKNOWN", message: (err as Error).message } };
  }
}

/**
 * Reschedule from the dashboard. Accepts an ISO timestamp in clinic-local
 * form (e.g. "2026-05-26T11:30") and converts to UTC using the clinic's
 * timezone — matching the AI tool boundary.
 */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  newStartsAtLocal: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { timezone: true },
  });
  if (!clinic) return { ok: false, error: { code: "CLINIC_NOT_FOUND", message: "Clinic missing" } };

  try {
    await rescheduleAppointment({
      appointmentId,
      clinicId: session.user.clinicId,
      newStartsAt: fromZonedTime(newStartsAtLocal, clinic.timezone),
    });
    await logAudit({
      clinicId: session.user.clinicId,
      actorUserId: session.user.id,
      action: "appointment.rescheduled",
      target: `appointment:${appointmentId}`,
      metadata: { newStartsAtLocal },
    });
    revalidatePath("/app/agenda");
    return { ok: true };
  } catch (err) {
    if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message } };
    return { ok: false, error: { code: "UNKNOWN", message: (err as Error).message } };
  }
}

/**
 * Mark an OPEN/IN_PROGRESS handoff as RESOLVED. Used by the
 * "needs-attention" inbox in the conversations page.
 */
export async function resolveHandoffAction(handoffId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const handoff = await prisma.humanHandoff.findUnique({ where: { id: handoffId } });
  if (!handoff || handoff.clinicId !== session.user.clinicId) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Handoff not found" } };
  }
  await prisma.humanHandoff.update({
    where: { id: handoffId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      assignedUserId: session.user.id ?? null,
    },
  });
  // Clear requiresHuman + resume the bot when no other open handoffs remain.
  const stillOpen = await prisma.humanHandoff.count({
    where: { conversationId: handoff.conversationId, status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  if (stillOpen === 0) {
    await prisma.conversation.update({
      where: { id: handoff.conversationId },
      data: { requiresHuman: false, botPaused: false },
    });
  }

  await logAudit({
    clinicId: session.user.clinicId,
    actorUserId: session.user.id,
    action: "handoff.resolved",
    target: `handoff:${handoff.id}`,
    metadata: { conversationId: handoff.conversationId, reason: handoff.reason },
  });

  revalidatePath("/app/conversations");
  return { ok: true };
}

/**
 * Pause or resume the AI bot on a single conversation. While paused, the
 * orchestrator records inbound messages but skips the LLM call and
 * outbound send. Staff use this in tandem with the manual composer.
 */
export async function setBotPausedAction(
  conversationId: string,
  paused: boolean,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, clinicId: session.user.clinicId },
    select: { id: true },
  });
  if (!conv) return { ok: false, error: { code: "NOT_FOUND", message: "Conversación no encontrada" } };

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { botPaused: paused },
  });

  await logAudit({
    clinicId: session.user.clinicId,
    actorUserId: session.user.id,
    action: paused ? "bot.paused" : "bot.resumed",
    target: `conversation:${conv.id}`,
  });

  revalidatePath("/app/conversations");
  return { ok: true };
}

/**
 * Send a manual WhatsApp reply from the dashboard. Staff use this to
 * override the bot when a conversation has been escalated. Persists an
 * outbound ASSISTANT Message row with `metadata.source = "manual"` so the
 * transcript still reads in chronological order. Does NOT auto-resolve the
 * handoff — use `resolveHandoffAction` for that.
 */
export async function sendManualReplyAction(
  conversationId: string,
  text: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const body = text.trim();
  if (!body) return { ok: false, error: { code: "EMPTY", message: "Mensaje vacío" } };

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, clinicId: session.user.clinicId },
    include: {
      patient: { select: { phone: true } },
      clinic: { select: { whatsappNumber: true } },
    },
  });
  if (!conv) return { ok: false, error: { code: "NOT_FOUND", message: "Conversación no encontrada" } };

  const toAddress = conv.patient?.phone ?? conv.externalChatId;
  if (!toAddress) {
    return { ok: false, error: { code: "NO_RECIPIENT", message: "Sin número de paciente" } };
  }
  if (!conv.clinic.whatsappNumber) {
    return {
      ok: false,
      error: { code: "NO_CLINIC_NUMBER", message: "La clínica no tiene número de WhatsApp configurado" },
    };
  }

  const provider = getWhatsAppProvider();
  const result = await provider.send({
    fromAddress: conv.clinic.whatsappNumber,
    toAddress,
    text: body,
  });

  if (result.status === "FAILED") {
    return {
      ok: false,
      error: { code: "PROVIDER_FAILED", message: result.error ?? "El proveedor rechazó el envío" },
    };
  }

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conv.id,
        role: "ASSISTANT",
        content: body,
        metadata: {
          source: "manual",
          actorUserId: session.user.id,
          provider: provider.id,
          providerMessageId: result.providerMessageId ?? null,
          status: result.status,
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  incr("aizorix_manual_replies_total", { provider: provider.id });
  await logAudit({
    clinicId: session.user.clinicId,
    actorUserId: session.user.id,
    action: "manual_reply.sent",
    target: `conversation:${conv.id}`,
    metadata: { provider: provider.id, status: result.status, length: body.length },
  });

  revalidatePath("/app/conversations");
  return { ok: true };
}

const notesSchema = z
  .string()
  .max(2000, "Máximo 2000 caracteres")
  .transform((v) => v.trim())
  .transform((v) => (v === "" ? null : v));

/**
 * Update the free-text notes on a patient. Clinic-scoped (cross-tenant
 * updates are rejected with NOT_FOUND). Empty input is stored as NULL so
 * the patient detail card hides the "Notas" section cleanly when staff
 * delete their note text.
 *
 * Any authenticated staff member can write notes — they're internal
 * context, not a setting that needs OWNER permissions.
 */
export async function updatePatientNotesAction(
  patientId: string,
  notes: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const parsed = notesSchema.safeParse(notes);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  // findFirst + the clinic predicate gives us the cross-tenant NOT_FOUND
  // case without raising a P2025 from prisma.patient.update.
  const target = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: session.user.clinicId },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Paciente no encontrado" } };
  }

  await prisma.patient.update({
    where: { id: target.id },
    data: { notes: parsed.data },
  });

  await logAudit({
    clinicId: session.user.clinicId,
    actorUserId: session.user.id,
    action: "patient.notes_updated",
    target: `patient:${target.id}`,
    metadata: { length: parsed.data?.length ?? 0 },
  });

  revalidatePath(`/app/clients/${target.id}`);
  return { ok: true };
}

const createApptSchema = z.object({
  patientId: z.string().min(1, "Selecciona un paciente"),
  treatmentId: z.string().min(1, "Selecciona un tratamiento"),
  technicianId: z.string().min(1, "Selecciona un técnico"),
  // Browser datetime-local format: YYYY-MM-DDTHH:mm (no Z, no offset).
  startsAtLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Fecha/hora no válida"),
  notes: z
    .string()
    .max(2000)
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  bypassLeadTime: z.boolean().optional(),
});

export type CreateAppointmentInput = z.input<typeof createApptSchema>;

/**
 * Manually create an appointment from the dashboard. Wraps the same
 * Serializable booking transaction the bot uses (so overlap, business
 * hours, eligibility, lead-time, and exclusivity are all enforced — but
 * staff can bypass lead-time with `bypassLeadTime` for last-minute walk-ins).
 *
 * Marks the row with createdBy = STAFF so metrics can distinguish bot-driven
 * bookings from manual ones.
 */
export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<ActionResult & { appointmentId?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const parsed = createApptSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { timezone: true },
  });
  if (!clinic) return { ok: false, error: { code: "CLINIC_NOT_FOUND", message: "Clínica" } };

  try {
    const appt = await bookAppointment({
      clinicId: session.user.clinicId,
      patientId: parsed.data.patientId,
      treatmentId: parsed.data.treatmentId,
      technicianId: parsed.data.technicianId,
      startsAt: fromZonedTime(parsed.data.startsAtLocal, clinic.timezone),
      notes: parsed.data.notes,
      createdBy: "STAFF",
      bypassLeadTime: parsed.data.bypassLeadTime,
    });
    await logAudit({
      clinicId: session.user.clinicId,
      actorUserId: session.user.id,
      action: "appointment.created",
      target: `appointment:${appt.id}`,
      metadata: {
        patientId: parsed.data.patientId,
        treatmentId: parsed.data.treatmentId,
        startsAtLocal: parsed.data.startsAtLocal,
        bypassLeadTime: parsed.data.bypassLeadTime,
      },
    });
    revalidatePath("/app/agenda");
    revalidatePath("/app");
    return { ok: true, appointmentId: appt.id };
  } catch (err) {
    if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message } };
    return { ok: false, error: { code: "UNKNOWN", message: (err as Error).message } };
  }
}
