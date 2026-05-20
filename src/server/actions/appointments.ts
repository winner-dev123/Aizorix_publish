"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { cancelAppointment } from "@/server/booking/cancel";
import { rescheduleAppointment } from "@/server/booking/reschedule";
import { isDomainError } from "@/server/errors";
import { getWhatsAppProvider } from "@/server/whatsapp";

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

  revalidatePath("/app/conversations");
  return { ok: true };
}
