/**
 * Integration test for the orchestrator: real Prisma + Bellem seed,
 * mocked LLMClient. Skipped unless DATABASE_URL is set.
 *
 * The mock returns a scripted sequence of LLMResponses so we can verify:
 *   1. patient creation via find_or_create_patient
 *   2. tool execution against the real DB
 *   3. successful booking populating envelope metadata
 *   4. transcript persistence
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { orchestrate } from "../orchestrate";
import type { LLMClient, LLMResponse } from "../client";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("orchestrator (DB)", () => {
  let clinicId: string;
  let limpiezaId: string;
  let dianaId: string;
  const testPhone = "+34611999001";

  beforeAll(async () => {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;
    const limpieza = await prisma.treatment.findFirstOrThrow({
      where: { clinicId, slug: "limpieza-facial" },
    });
    limpiezaId = limpieza.id;
    const diana = await prisma.technician.findFirstOrThrow({
      where: { clinicId, name: "Diana" },
    });
    dianaId = diana.id;

    const existing = await prisma.patient.findFirst({ where: { clinicId, phone: testPhone } });
    if (existing) {
      await prisma.appointment.deleteMany({ where: { patientId: existing.id } });
      await prisma.aiMemory.deleteMany({ where: { patientId: existing.id } });
    }
    await prisma.conversation.deleteMany({ where: { clinicId, externalChatId: testPhone } });
    if (existing) await prisma.patient.delete({ where: { id: existing.id } });
  });

  afterAll(async () => {
    const existing = await prisma.patient.findFirst({ where: { clinicId, phone: testPhone } });
    if (existing) {
      await prisma.appointment.deleteMany({ where: { patientId: existing.id } });
      await prisma.aiMemory.deleteMany({ where: { patientId: existing.id } });
      await prisma.conversation.deleteMany({ where: { clinicId, externalChatId: testPhone } });
      await prisma.patient.delete({ where: { id: existing.id } });
    }
    await prisma.$disconnect();
  });

  it("creates patient, books appointment, persists transcript", async () => {
    // Build a Madrid-local timestamp for next Monday at 11:00 (in the tool's
    // naive-local format, no Z, no offset).
    const startsAtLocal = nextMondayMadridLocal(11);

    const scripted: LLMResponse[] = [
      // Turn 1: identify patient
      {
        text: "",
        stopReason: "tool_calls",
        toolCalls: [{ id: "call_1", name: "find_or_create_patient", input: { firstName: "Lucía" } }],
      },
      // Turn 2: book the slot
      {
        text: "",
        stopReason: "tool_calls",
        toolCalls: [
          {
            id: "call_2",
            name: "book_appointment",
            input: { treatmentId: limpiezaId, technicianId: dianaId, startsAtLocal },
          },
        ],
      },
      // Turn 3: final reply
      {
        text: "Listo Lucía, te he reservado limpieza facial con Diana.",
        stopReason: "stop",
        toolCalls: [],
      },
    ];

    let call = 0;
    const mock: LLMClient = {
      async chat() {
        const r = scripted[call];
        if (!r) throw new Error("Mock called more times than expected");
        call++;
        return r;
      },
    };

    const envelope = await orchestrate(
      {
        clinicId,
        externalChatId: testPhone,
        fromName: "Lucía",
        message: "Hola, quiero una limpieza facial con Diana el lunes a las 11.",
        now: new Date("2026-05-20T10:00:00Z"),
      },
      mock,
    );

    expect(envelope.accion).toBe("BOOK");
    expect(envelope.requiresHuman).toBe(false);
    expect(envelope.respuesta).toContain("limpieza");
    expect(envelope.metadata.appointmentId).toBeTruthy();
    expect(envelope.metadata.treatmentId).toBe(limpiezaId);
    expect(envelope.metadata.technicianId).toBe(dianaId);

    const patient = await prisma.patient.findFirst({ where: { clinicId, phone: testPhone } });
    expect(patient).toBeTruthy();
    expect(patient!.firstName).toBe("Lucía");
    expect(patient!.status).toBe("LEAD");

    const messages = await prisma.message.findMany({
      where: { conversationId: envelope.conversationId },
      orderBy: { createdAt: "asc" },
    });
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]!.role).toBe("USER");
    expect(messages.at(-1)!.role).toBe("ASSISTANT");
  });
});

function nextMondayMadridLocal(hour: number, minute = 0): string {
  const d = new Date();
  const dow = d.getUTCDay();
  const daysUntilMonday = ((1 - dow + 7) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}:00`;
}
