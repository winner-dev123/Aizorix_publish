/**
 * Tests for the Phase 5 pause-bot branch of the orchestrator and for the
 * side effect of escalate_to_human setting both `requiresHuman` and
 * `botPaused`.
 *
 *   1. orchestrate() short-circuits when conversation.botPaused === true:
 *      records the inbound USER message but returns PAUSED without
 *      invoking the LLM (so the webhook stays silent).
 *   2. The escalate_to_human tool flips both flags on the Conversation row.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { orchestrate } from "../orchestrate";
import type { LLMClient, LLMResponse } from "../client";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("orchestrator pause + escalate (DB)", () => {
  let clinicId: string;
  const pausedPhone = "+34611999201";
  const escalatePhone = "+34611999202";

  async function wipePatient(phone: string) {
    const existing = await prisma.patient.findFirst({ where: { clinicId, phone } });
    if (existing) {
      await prisma.appointment.deleteMany({ where: { patientId: existing.id } });
      await prisma.aiMemory.deleteMany({ where: { patientId: existing.id } });
    }
    await prisma.humanHandoff.deleteMany({
      where: { conversation: { externalChatId: phone, clinicId } },
    });
    await prisma.message.deleteMany({
      where: { conversation: { externalChatId: phone, clinicId } },
    });
    await prisma.conversation.deleteMany({ where: { clinicId, externalChatId: phone } });
    if (existing) await prisma.patient.delete({ where: { id: existing.id } });
  }

  beforeAll(async () => {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;
    await wipePatient(pausedPhone);
    await wipePatient(escalatePhone);
  });

  afterAll(async () => {
    await wipePatient(pausedPhone);
    await wipePatient(escalatePhone);
    await prisma.$disconnect();
  });

  it("short-circuits when botPaused is true and never calls the LLM", async () => {
    // Pre-seed a paused conversation so orchestrate hits its early-return branch.
    const conv = await prisma.conversation.create({
      data: {
        clinicId,
        channel: "WHATSAPP",
        externalChatId: pausedPhone,
        botPaused: true,
      },
    });

    let callCount = 0;
    const explodingLLM: LLMClient = {
      async chat() {
        callCount++;
        throw new Error("LLM should not be called when botPaused is true");
      },
    };

    const envelope = await orchestrate(
      {
        clinicId,
        externalChatId: pausedPhone,
        fromName: "Tester",
        message: "Hola, ¿alguien me atiende?",
      },
      explodingLLM,
    );

    expect(callCount).toBe(0);
    expect(envelope.accion).toBe("PAUSED");
    expect(envelope.respuesta).toBe("");
    expect(envelope.conversationId).toBe(conv.id);

    // The inbound USER message must still be persisted for the audit log.
    const userMessages = await prisma.message.findMany({
      where: { conversationId: conv.id, role: "USER" },
    });
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0]!.content).toBe("Hola, ¿alguien me atiende?");

    // No ASSISTANT message is written when we short-circuit.
    const assistantMessages = await prisma.message.findMany({
      where: { conversationId: conv.id, role: "ASSISTANT" },
    });
    expect(assistantMessages).toHaveLength(0);
  });

  it("escalate_to_human sets both requiresHuman and botPaused on the conversation", async () => {
    const scripted: LLMResponse[] = [
      {
        text: "",
        stopReason: "tool_calls",
        toolCalls: [
          {
            id: "call_esc",
            name: "escalate_to_human",
            input: { reason: "El paciente pide hablar con una persona." },
          },
        ],
      },
      {
        text: "He pasado tu mensaje a un compañero, te atenderá en breve.",
        stopReason: "stop",
        toolCalls: [],
      },
    ];

    let i = 0;
    const mock: LLMClient = {
      async chat() {
        const r = scripted[i++];
        if (!r) throw new Error("LLM mock exhausted");
        return r;
      },
    };

    const envelope = await orchestrate(
      {
        clinicId,
        externalChatId: escalatePhone,
        fromName: "Tester",
        message: "Quiero hablar con una persona, es urgente.",
      },
      mock,
    );

    expect(envelope.requiresHuman).toBe(true);

    const conv = await prisma.conversation.findUniqueOrThrow({
      where: { id: envelope.conversationId },
      select: { requiresHuman: true, botPaused: true },
    });
    expect(conv.requiresHuman).toBe(true);
    expect(conv.botPaused).toBe(true);

    // A HumanHandoff row should have been opened by the escalate_to_human tool.
    const handoffs = await prisma.humanHandoff.findMany({
      where: { conversationId: envelope.conversationId },
    });
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0]!.status).toBe("OPEN");
  });
});
