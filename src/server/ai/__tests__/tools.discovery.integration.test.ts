/**
 * Integration tests for the AI tools surface added when wiring the bot to
 * the full clinic dataset:
 *   - list_treatments
 *   - list_technicians
 *   - list_business_hours
 *   - list_patient_appointments
 *   - find_or_create_patient PHONE_REQUIRED branch + explicit phone arg
 *   - book_appointment DUPLICATE_BOOKING guard
 *
 * Uses the seeded Bellem clinic. Skipped without DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatchTool, type ToolContext } from "../tools";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("AI tools — discovery + safeguards", () => {
  let clinicId: string;
  let limpiezaId: string;
  let dianaId: string;
  let patientId: string;
  const patientPhone = "+34611888001";

  beforeAll(async () => {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;
    limpiezaId = (
      await prisma.treatment.findFirstOrThrow({
        where: { clinicId, slug: "limpieza-facial" },
      })
    ).id;
    dianaId = (
      await prisma.technician.findFirstOrThrow({ where: { clinicId, name: "Diana" } })
    ).id;

    // Wipe any leftover patient + appts from prior runs
    const existing = await prisma.patient.findFirst({
      where: { clinicId, phone: patientPhone },
    });
    if (existing) {
      await prisma.appointment.deleteMany({ where: { patientId: existing.id } });
      await prisma.aiMemory.deleteMany({ where: { patientId: existing.id } });
      await prisma.conversation.updateMany({
        where: { patientId: existing.id },
        data: { patientId: null },
      });
      await prisma.patient.delete({ where: { id: existing.id } });
    }
    const p = await prisma.patient.create({
      data: {
        clinicId,
        firstName: "Discovery",
        lastName: "Tester",
        phone: patientPhone,
        status: "ACTIVE",
        source: "WHATSAPP_BOT",
      },
    });
    patientId = p.id;
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { patientId } });
    await prisma.patient.delete({ where: { id: patientId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  function ctx(overrides: Partial<ToolContext> = {}): ToolContext {
    return {
      clinicId,
      clinicTimezone: "Europe/Madrid",
      conversationId: "conv-discovery",
      patientId,
      externalChatId: patientPhone,
      now: new Date("2026-05-20T10:00:00Z"),
      ...overrides,
    };
  }

  // ───── list_treatments ────────────────────────────────────────────────
  describe("list_treatments", () => {
    it("returns every active treatment with name + duration + price", async () => {
      const res = await dispatchTool("list_treatments", {}, ctx());
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const data = res.data as {
        treatments: Array<{ name: string; durationMinutes: number; price: number | null }>;
      };
      expect(data.treatments.length).toBeGreaterThan(0);
      const limpieza = data.treatments.find((t) => t.name === "Limpieza facial");
      expect(limpieza).toBeDefined();
      expect(limpieza!.durationMinutes).toBeGreaterThan(0);
    });
  });

  // ───── list_technicians ───────────────────────────────────────────────
  describe("list_technicians", () => {
    it("returns active technicians with the treatments they perform", async () => {
      const res = await dispatchTool("list_technicians", {}, ctx());
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const data = res.data as {
        technicians: Array<{ id: string; name: string; treatments: { name: string }[] }>;
      };
      const diana = data.technicians.find((t) => t.name === "Diana");
      expect(diana).toBeDefined();
      expect(diana!.treatments.some((t) => t.name === "Limpieza facial")).toBe(true);
    });
  });

  // ───── list_business_hours ────────────────────────────────────────────
  describe("list_business_hours", () => {
    it("returns a 7-day schedule with timezone", async () => {
      const res = await dispatchTool("list_business_hours", {}, ctx());
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const data = res.data as {
        timezone: string;
        schedule: Array<{
          dayOfWeek: number;
          day: string;
          windows: Array<{ opensAt: string; closesAt: string }>;
          closed: boolean;
        }>;
      };
      expect(data.timezone).toBe("Europe/Madrid");
      expect(data.schedule).toHaveLength(7);
      // Bellem opens Monday-Saturday in the seed, so at least one day must
      // have windows.
      expect(data.schedule.some((d) => d.windows.length > 0)).toBe(true);
    });
  });

  // ───── list_patient_appointments ──────────────────────────────────────
  describe("list_patient_appointments", () => {
    it("returns PATIENT_REQUIRED when patientId is missing", async () => {
      const res = await dispatchTool(
        "list_patient_appointments",
        {},
        ctx({ patientId: null }),
      );
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("PATIENT_REQUIRED");
    });

    it("returns the patient's appointments within the ±window", async () => {
      // Insert a future appt
      const future = new Date("2026-06-08T09:00:00Z");
      const appt = await prisma.appointment.create({
        data: {
          clinicId,
          patientId,
          treatmentId: limpiezaId,
          technicianId: dianaId,
          startsAt: future,
          endsAt: new Date(future.getTime() + 60 * 60 * 1000),
          status: "CONFIRMED",
          createdBy: "STAFF",
        },
      });
      try {
        const res = await dispatchTool("list_patient_appointments", {}, ctx());
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const data = res.data as {
          appointments: Array<{ id: string; status: string; isPast: boolean }>;
        };
        const found = data.appointments.find((a) => a.id === appt.id);
        expect(found).toBeDefined();
        expect(found!.status).toBe("CONFIRMED");
        expect(found!.isPast).toBe(false);
      } finally {
        await prisma.appointment.delete({ where: { id: appt.id } });
      }
    });
  });

  // ───── find_or_create_patient — PHONE_REQUIRED + explicit phone ──────
  describe("find_or_create_patient", () => {
    const newPhone = "+34611888002";

    afterAll(async () => {
      await prisma.patient
        .deleteMany({ where: { clinicId, phone: newPhone } })
        .catch(() => undefined);
    });

    it("returns PHONE_REQUIRED when externalChatId isn't a phone and no phone arg passed", async () => {
      const res = await dispatchTool(
        "find_or_create_patient",
        { firstName: "WebDemo" },
        ctx({ patientId: null, externalChatId: "demo-user-abc123" }),
      );
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("PHONE_REQUIRED");
    });

    it("accepts an explicit `phone` arg and creates the patient", async () => {
      const res = await dispatchTool(
        "find_or_create_patient",
        { firstName: "WebDemo", phone: newPhone },
        ctx({ patientId: null, externalChatId: "demo-user-abc123" }),
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const data = res.data as { patientId: string; phone: string; isNew: boolean };
      expect(data.phone).toBe(newPhone);
      expect(data.isNew).toBe(true);
    });

    it("falls back to externalChatId when it's already in E.164", async () => {
      // patientPhone is in E.164 — should resolve to the seeded patient.
      const res = await dispatchTool(
        "find_or_create_patient",
        { firstName: "Discovery" },
        ctx({ patientId: null }),
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const data = res.data as { patientId: string; isNew: boolean };
      expect(data.patientId).toBe(patientId);
      expect(data.isNew).toBe(false);
    });
  });

  // ───── book_appointment DUPLICATE_BOOKING guard ───────────────────────
  describe("book_appointment duplicate guard", () => {
    it("refuses to book when the patient already has an ACTIVE appt for the same treatment", async () => {
      const existing = await prisma.appointment.create({
        data: {
          clinicId,
          patientId,
          treatmentId: limpiezaId,
          technicianId: dianaId,
          startsAt: new Date("2026-06-08T09:00:00Z"),
          endsAt: new Date("2026-06-08T10:00:00Z"),
          status: "CONFIRMED",
          createdBy: "STAFF",
        },
      });
      try {
        const res = await dispatchTool(
          "book_appointment",
          {
            treatmentId: limpiezaId,
            technicianId: dianaId,
            startsAtLocal: "2026-06-10T10:00:00",
          },
          ctx(),
        );
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.error.code).toBe("DUPLICATE_BOOKING");
        // The error message MUST include the existing appt id so the LLM
        // can reschedule/cancel it without another lookup.
        expect(res.error.message).toContain(existing.id);
      } finally {
        await prisma.appointment.delete({ where: { id: existing.id } });
      }
    });

    it("allows booking a different treatment even when one is already booked", async () => {
      const dermapenId = (
        await prisma.treatment.findFirstOrThrow({
          where: { clinicId, slug: "dermapen" },
        })
      ).id;
      const existing = await prisma.appointment.create({
        data: {
          clinicId,
          patientId,
          treatmentId: limpiezaId,
          technicianId: dianaId,
          startsAt: new Date("2026-06-08T09:00:00Z"),
          endsAt: new Date("2026-06-08T10:00:00Z"),
          status: "CONFIRMED",
          createdBy: "STAFF",
        },
      });
      try {
        const res = await dispatchTool(
          "book_appointment",
          {
            treatmentId: dermapenId,
            technicianId: dianaId,
            startsAtLocal: "2026-06-09T10:00:00",
          },
          ctx(),
        );
        // It may succeed or fail (depends on whether Diana is allowed
        // for dermapen at that hour) — the only thing we're checking is
        // that the failure code, if any, is NOT DUPLICATE_BOOKING.
        if (!res.ok) {
          expect(res.error.code).not.toBe("DUPLICATE_BOOKING");
        }
      } finally {
        await prisma.appointment.deleteMany({ where: { patientId } });
        await prisma.appointment
          .delete({ where: { id: existing.id } })
          .catch(() => undefined);
      }
    });
  });
});
