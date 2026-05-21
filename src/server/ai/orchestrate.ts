import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { incr } from "../metrics";
import { getLLMClient } from "./openai";
import type { LLMClient, LLMMessage } from "./client";
import { buildSystemPrompt } from "./prompt";
import { dispatchTool, getToolDefinitions, type ToolContext } from "./tools";
import type { Action, EnvelopeMetadata, OrchestrateInput, OrchestratorEnvelope } from "./types";

const MAX_TOOL_ITERATIONS = 6;
const HISTORY_WINDOW = 12;

/**
 * Orchestrates a single inbound message. Loads or creates the Conversation,
 * runs the tool-use loop against the underlying LLM, persists every turn,
 * and returns the envelope the WhatsApp adapter / dashboard will deliver.
 *
 * The `client` parameter is dependency-injected so tests can script a
 * deterministic sequence of LLM responses without hitting the network.
 */
export async function orchestrate(
  input: OrchestrateInput,
  client: LLMClient = getLLMClient(),
): Promise<OrchestratorEnvelope> {
  const now = input.now ?? new Date();
  const channel = input.channel ?? "WHATSAPP";

  const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
  if (!clinic) throw new Error(`Clinic ${input.clinicId} not found`);

  const conversation = await prisma.conversation.upsert({
    where: {
      clinicId_channel_externalChatId: {
        clinicId: input.clinicId,
        channel,
        externalChatId: input.externalChatId,
      },
    },
    update: { lastMessageAt: now },
    create: {
      clinicId: input.clinicId,
      channel,
      externalChatId: input.externalChatId,
      lastMessageAt: now,
    },
  });

  const patient = conversation.patientId
    ? await prisma.patient.findUnique({ where: { id: conversation.patientId } })
    : await prisma.patient.findFirst({
        where: { clinicId: input.clinicId, phone: input.externalChatId },
      });

  if (patient && !conversation.patientId) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { patientId: patient.id },
    });
  }

  const memories = patient
    ? await prisma.aiMemory.findMany({
        where: { patientId: patient.id },
        select: { key: true, value: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : [];

  const priorMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_WINDOW,
  });
  const historyChronological = priorMessages.slice().reverse();

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: input.message,
    },
  });

  // If staff has paused the bot for this conversation, record the inbound
  // message but skip the LLM round-trip. The caller (webhook) sees the empty
  // respuesta and skips the outbound send. Staff will resume by toggling off.
  if (conversation.botPaused) {
    incr("aizorix_orchestrate_runs_total", { outcome: "paused" });
    return {
      respuesta: "",
      accion: "PAUSED",
      requiresHuman: conversation.requiresHuman,
      metadata: {},
      conversationId: conversation.id,
    };
  }

  const systemPrompt = buildSystemPrompt({
    clinic: {
      name: clinic.name,
      timezone: clinic.timezone,
      aiTone: clinic.aiTone,
      aiGuidance: clinic.aiGuidance,
    },
    externalChatId: input.externalChatId,
    patientId: patient?.id ?? null,
    patientFirstName: patient?.firstName ?? input.fromName ?? null,
    memories,
    nowISO: now.toISOString(),
  });

  const messages: LLMMessage[] = [
    ...historyChronological
      .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
      .map<LLMMessage>((m) =>
        m.role === "USER"
          ? { role: "user", content: m.content }
          : { role: "assistant", content: m.content },
      ),
    { role: "user", content: input.message },
  ];

  const tools = getToolDefinitions();
  const toolNamesInvoked: string[] = [];
  const toolTrace: Array<{ name: string; input: unknown; result: unknown }> = [];
  const metadata: EnvelopeMetadata = {};
  let action: Action = "NONE";
  let finalText = "";
  let currentPatientId = patient?.id ?? null;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = await client.chat({
      system: systemPrompt,
      messages,
      tools,
      maxTokens: 1024,
    });

    finalText = response.text.trim();

    // Mirror the assistant turn into history so the model sees its own tool_calls next round.
    messages.push({
      role: "assistant",
      content: response.text,
      toolCalls: response.toolCalls.length ? response.toolCalls : undefined,
    });

    if (response.stopReason !== "tool_calls" || response.toolCalls.length === 0) {
      break;
    }

    const ctx: ToolContext = {
      clinicId: input.clinicId,
      clinicTimezone: clinic.timezone,
      conversationId: conversation.id,
      patientId: currentPatientId,
      externalChatId: input.externalChatId,
      now,
    };

    for (const call of response.toolCalls) {
      toolNamesInvoked.push(call.name);
      const result = await dispatchTool(call.name, call.input, ctx);
      toolTrace.push({ name: call.name, input: call.input, result });
      if (process.env.AI_DEBUG === "1") {
        console.log(
          `[AI_DEBUG] tool=${call.name} input=${JSON.stringify(call.input)} result=${JSON.stringify(result).slice(0, 400)}`,
        );
      }

      if (call.name === "find_or_create_patient" && result.ok) {
        const data = result.data as { patientId: string };
        currentPatientId = data.patientId;
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { patientId: data.patientId },
        });
        metadata.patientId = data.patientId;
      }
      if (call.name === "book_appointment" && result.ok) {
        const data = result.data as {
          appointment: { id: string; treatmentId: string; technicianId: string; startsAt: Date; endsAt: Date };
        };
        action = "BOOK";
        metadata.appointmentId = data.appointment.id;
        metadata.treatmentId = data.appointment.treatmentId;
        metadata.technicianId = data.appointment.technicianId;
        metadata.startsAt = data.appointment.startsAt.toISOString();
        metadata.endsAt = data.appointment.endsAt.toISOString();
      }
      if (call.name === "reschedule_appointment" && result.ok) {
        const data = result.data as { appointment: { id: string; startsAt: Date; endsAt: Date } };
        action = "RESCHEDULE";
        metadata.appointmentId = data.appointment.id;
        metadata.startsAt = data.appointment.startsAt.toISOString();
        metadata.endsAt = data.appointment.endsAt.toISOString();
      }
      if (call.name === "cancel_appointment" && result.ok) {
        const data = result.data as { appointment: { id: string } };
        action = "CANCEL";
        metadata.appointmentId = data.appointment.id;
      }
      if (call.name === "escalate_to_human" && result.ok) {
        const data = result.data as { reason: string };
        metadata.reason = data.reason;
      }

      messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify(result),
        isError: !result.ok,
      });
    }
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: finalText,
      metadata: {
        toolsInvoked: toolNamesInvoked,
        toolTrace,
        action,
      } as Prisma.InputJsonValue,
    },
  });

  const updatedConversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversation.id },
    select: { requiresHuman: true },
  });

  incr("aizorix_orchestrate_runs_total", { outcome: "ok" });

  return {
    respuesta: finalText,
    accion: action === "NONE" && toolNamesInvoked.length > 0 ? "INFO" : action,
    requiresHuman: updatedConversation.requiresHuman,
    metadata,
    conversationId: conversation.id,
  };
}
