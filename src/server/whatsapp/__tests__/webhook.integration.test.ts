/**
 * Integration test for the inbound → orchestrate → outbound loop.
 *
 * Drives the orchestrator with a scripted LLMClient (so no OpenAI calls)
 * and uses the StubWhatsAppProvider so we can inspect what would have
 * been sent back to the patient. Skipped without DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../db";
import { orchestrate } from "../../ai/orchestrate";
import { StubWhatsAppProvider } from "../stub";
import type { LLMClient, LLMResponse } from "../../ai/client";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("whatsapp webhook (DB)", () => {
  const clinicWhatsApp = "+34911000000";
  const patientPhone = "+34611999077";
  let clinicId: string;
  let limpiezaId: string;
  let dianaId: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    if (clinic.whatsappNumber !== clinicWhatsApp) {
      await prisma.clinic.update({
        where: { id: clinic.id },
        data: { whatsappNumber: clinicWhatsApp },
      });
    }
    clinicId = clinic.id;
    limpiezaId = (
      await prisma.treatment.findFirstOrThrow({ where: { clinicId, slug: "limpieza-facial" } })
    ).id;
    dianaId = (await prisma.technician.findFirstOrThrow({ where: { clinicId, name: "Diana" } })).id;

    const existing = await prisma.patient.findFirst({
      where: { clinicId, phone: patientPhone },
    });
    if (existing) {
      await prisma.appointment.deleteMany({ where: { patientId: existing.id } });
      await prisma.aiMemory.deleteMany({ where: { patientId: existing.id } });
    }
    await prisma.message.deleteMany({
      where: { conversation: { externalChatId: patientPhone } },
    });
    await prisma.conversation.deleteMany({ where: { externalChatId: patientPhone } });
    if (existing) await prisma.patient.delete({ where: { id: existing.id } });
  });

  afterAll(async () => {
    // Clean up the appointment + conversation this test creates so it
    // doesn't leave Diana's 2026-06-08 11:00 slot occupied. Otherwise, on
    // dates where another test's relative slot (e.g. "today + 14 days")
    // lands on 2026-06-08, that test hits a spurious OVERLAP. Cleaning up
    // in afterAll (not just beforeAll) keeps the suite order-independent.
    const patient = await prisma.patient.findFirst({
      where: { clinicId, phone: patientPhone },
    });
    if (patient) {
      await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
      await prisma.aiMemory.deleteMany({ where: { patientId: patient.id } });
    }
    await prisma.message.deleteMany({
      where: { conversation: { externalChatId: patientPhone } },
    });
    await prisma.conversation.deleteMany({ where: { externalChatId: patientPhone } });
    await prisma.$disconnect();
  });

  it("orchestrates a scripted booking and the stub provider captures the reply", async () => {
    const startsAtLocal = "2026-06-08T11:00:00"; // next Monday-ish, well-known business hours
    const scripted: LLMResponse[] = [
      {
        text: "",
        stopReason: "tool_calls",
        toolCalls: [
          { id: "c1", name: "find_or_create_patient", input: { firstName: "Lucía" } },
        ],
      },
      {
        text: "",
        stopReason: "tool_calls",
        toolCalls: [
          {
            id: "c2",
            name: "book_appointment",
            input: { treatmentId: limpiezaId, technicianId: dianaId, startsAtLocal },
          },
        ],
      },
      {
        text: "Listo Lucía, te he reservado la limpieza con Diana el lunes 8 de junio a las 11:00.",
        stopReason: "stop",
        toolCalls: [],
      },
    ];
    let i = 0;
    const llmMock: LLMClient = {
      async chat() {
        const r = scripted[i++];
        if (!r) throw new Error("LLM mock exhausted");
        return r;
      },
    };

    // Drive the orchestrator the same way the webhook route would, then
    // hand the response to the stub provider.
    const envelope = await orchestrate(
      {
        clinicId,
        channel: "WHATSAPP",
        externalChatId: patientPhone,
        fromName: "Lucía",
        message: "Hola, soy Lucía. Quiero limpieza facial con Diana el lunes 8 a las 11.",
        now: new Date("2026-05-20T10:00:00Z"),
      },
      llmMock,
    );

    const provider = new StubWhatsAppProvider();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const result = await provider.send({
      fromAddress: clinicWhatsApp,
      toAddress: patientPhone,
      text: envelope.respuesta,
    });
    log.mockRestore();

    expect(envelope.accion).toBe("BOOK");
    expect(result.status).toBe("SENT");
    expect(provider.history()).toHaveLength(1);
    expect(provider.history()[0]).toMatchObject({
      fromAddress: clinicWhatsApp,
      toAddress: patientPhone,
    });
    expect(provider.history()[0]!.text).toContain("limpieza");

    const appt = await prisma.appointment.findFirst({
      where: { patientId: envelope.metadata.patientId },
    });
    expect(appt).toBeTruthy();
    expect(appt!.startsAt.toISOString()).toBe("2026-06-08T09:00:00.000Z"); // 11:00 Madrid CEST
  });
});
