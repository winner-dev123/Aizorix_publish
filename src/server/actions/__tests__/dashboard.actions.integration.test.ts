/**
 * Integration tests for the Phase 5 dashboard actions.
 *
 *   - sendManualReplyAction:  auth gate, clinic scope, empty text, outbound
 *                             persistence + metadata, NO_CLINIC_NUMBER guard
 *   - setBotPausedAction:     auth gate, clinic scope, flips both directions
 *
 * Mocks @/auth so the action's session lookup returns a deterministic user.
 * Mocks next/cache so revalidatePath doesn't blow up without the Next.js
 * static-generation store.
 *
 * The WhatsApp send goes through the stub provider (default when Twilio
 * env is unset), so no external traffic.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../../db";
import {
  createAppointmentAction,
  sendManualReplyAction,
  setBotPausedAction,
  updatePatientNotesAction,
} from "../appointments";
import { auth } from "@/auth";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

type SessionRole = "OWNER" | "ADMIN" | "RECEPTIONIST" | "STAFF";

function mockSession(clinicId: string, role: SessionRole = "OWNER", userId = "test-staff") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: userId, clinicId, role, email: "test@example.com" },
    expires: "2999-01-01T00:00:00.000Z",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describeMaybe("dashboard server actions (DB)", () => {
  let clinicId: string;
  let otherClinicId: string;
  let conversationId: string;
  let convNoNumberClinicId: string;
  let convNoNumberId: string;
  const phone = "+34611999301";
  const otherPhone = "+34611999302";

  async function wipeConversationByPhone(phone: string) {
    await prisma.message.deleteMany({
      where: { conversation: { externalChatId: phone } },
    });
    await prisma.conversation.deleteMany({ where: { externalChatId: phone } });
  }

  beforeAll(async () => {
    await prisma.clinic.deleteMany({
      where: { slug: { in: ["test-dash-actions", "test-dash-no-number"] } },
    });

    const a = await prisma.clinic.create({
      data: {
        name: "Dash Test A",
        slug: "test-dash-actions",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        whatsappNumber: "+34911999301",
      },
    });
    clinicId = a.id;

    const b = await prisma.clinic.create({
      data: {
        name: "Dash Test B",
        slug: "test-dash-no-number",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        // No whatsappNumber on purpose so NO_CLINIC_NUMBER fires.
      },
    });
    convNoNumberClinicId = b.id;

    // Conversation A: full clinic + phone, used for the happy path + pause toggle.
    await wipeConversationByPhone(phone);
    const conv = await prisma.conversation.create({
      data: {
        clinicId,
        channel: "WHATSAPP",
        externalChatId: phone,
      },
    });
    conversationId = conv.id;

    // Conversation B: clinic with no WhatsApp number, used for NO_CLINIC_NUMBER.
    await wipeConversationByPhone(otherPhone);
    const conv2 = await prisma.conversation.create({
      data: {
        clinicId: convNoNumberClinicId,
        channel: "WHATSAPP",
        externalChatId: otherPhone,
      },
    });
    convNoNumberId = conv2.id;
    otherClinicId = b.id;
  });

  afterAll(async () => {
    await wipeConversationByPhone(phone);
    await wipeConversationByPhone(otherPhone);
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicId, otherClinicId] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  // ---------- sendManualReplyAction ----------

  describe("sendManualReplyAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await sendManualReplyAction(conversationId, "Hola");
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns EMPTY for blank text", async () => {
      mockSession(clinicId);
      const res = await sendManualReplyAction(conversationId, "   \n   ");
      expect(res.ok === false && res.error.code).toBe("EMPTY");
    });

    it("returns NOT_FOUND for a conversation from another clinic", async () => {
      mockSession(otherClinicId); // session is clinic B, conversation is clinic A
      const res = await sendManualReplyAction(conversationId, "Hola");
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("returns NO_CLINIC_NUMBER when the clinic has no WhatsApp number set", async () => {
      mockSession(convNoNumberClinicId);
      const res = await sendManualReplyAction(convNoNumberId, "Hola");
      expect(res.ok === false && res.error.code).toBe("NO_CLINIC_NUMBER");
    });

    it("happy path: persists an outbound ASSISTANT message with metadata.source=manual", async () => {
      mockSession(clinicId, "OWNER", "test-actor-1");

      const before = await prisma.message.count({ where: { conversationId } });
      const res = await sendManualReplyAction(conversationId, "Hola Lucía, te llamo ya.");
      expect(res.ok).toBe(true);

      const after = await prisma.message.findMany({
        where: { conversationId, role: "ASSISTANT" },
        orderBy: { createdAt: "desc" },
      });
      expect(after.length).toBeGreaterThan(0);
      const latest = after[0]!;
      expect(latest.content).toBe("Hola Lucía, te llamo ya.");
      const metadata = latest.metadata as Record<string, unknown> | null;
      expect(metadata?.source).toBe("manual");
      expect(metadata?.actorUserId).toBe("test-actor-1");
      expect(metadata?.provider).toBe("stub");
      // The stub provider returns SENT immediately.
      expect(metadata?.status).toBe("SENT");

      const totalAfter = await prisma.message.count({ where: { conversationId } });
      expect(totalAfter).toBe(before + 1);
    });
  });

  // ---------- setBotPausedAction ----------

  describe("setBotPausedAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await setBotPausedAction(conversationId, true);
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns NOT_FOUND for a conversation from another clinic", async () => {
      mockSession(otherClinicId);
      const res = await setBotPausedAction(conversationId, true);
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("happy path: flips botPaused to true and then back to false", async () => {
      mockSession(clinicId);

      const r1 = await setBotPausedAction(conversationId, true);
      expect(r1.ok).toBe(true);
      const c1 = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { botPaused: true },
      });
      expect(c1.botPaused).toBe(true);

      const r2 = await setBotPausedAction(conversationId, false);
      expect(r2.ok).toBe(true);
      const c2 = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { botPaused: true },
      });
      expect(c2.botPaused).toBe(false);
    });
  });

  // ---------- updatePatientNotesAction ----------

  describe("updatePatientNotesAction", () => {
    let patientId: string;
    let otherClinicPatientId: string;

    beforeAll(async () => {
      const a = await prisma.patient.create({
        data: {
          clinicId,
          firstName: "Notes",
          lastName: "Tester",
          phone: "+34611700991",
          status: "ACTIVE",
        },
      });
      patientId = a.id;
      const b = await prisma.patient.create({
        data: {
          clinicId: otherClinicId,
          firstName: "Other",
          lastName: "Clinic",
          phone: "+34611700992",
          status: "ACTIVE",
        },
      });
      otherClinicPatientId = b.id;
    });

    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await updatePatientNotesAction(patientId, "hola");
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns VALIDATION_ERROR when notes exceed 2000 chars", async () => {
      mockSession(clinicId);
      const res = await updatePatientNotesAction(patientId, "x".repeat(2001));
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns NOT_FOUND for cross-tenant patient", async () => {
      mockSession(clinicId); // session is clinic A
      const res = await updatePatientNotesAction(otherClinicPatientId, "hola");
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("trims whitespace and persists", async () => {
      mockSession(clinicId);
      const res = await updatePatientNotesAction(patientId, "  Siempre con Diana.  ");
      expect(res.ok).toBe(true);
      const after = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
      expect(after.notes).toBe("Siempre con Diana.");
    });

    it("stores empty/whitespace as NULL (clears the field)", async () => {
      mockSession(clinicId);
      // Seed something first so we can confirm the clear.
      await prisma.patient.update({
        where: { id: patientId },
        data: { notes: "anterior" },
      });
      const res = await updatePatientNotesAction(patientId, "   \n  ");
      expect(res.ok).toBe(true);
      const after = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
      expect(after.notes).toBeNull();
    });
  });

  // ---------- createAppointmentAction ----------

  describe("createAppointmentAction", () => {
    // We need a clinic with real treatments + technicians + business hours, so
    // we lean on the seeded Bellem clinic. Test rows are tagged with a marker
    // in notes so cleanup is unambiguous across reruns.
    const NOTES_MARKER = "TEST_MARKER_CREATE_APPT";
    let bellemClinicId: string;
    let bellemPatientId: string;
    let bellemTreatmentId: string;
    let bellemTechnicianId: string;

    function futureWeekdayLocal(): string {
      // 14 days out at 11:00 — far enough that nothing else uses that slot.
      // 14 days from now starts on the same weekday as today; if today is
      // Sunday, business hours are closed → bump to +15.
      const target = new Date();
      target.setDate(target.getDate() + 14);
      if (target.getDay() === 0) target.setDate(target.getDate() + 1);
      target.setHours(11, 0, 0, 0);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, "0");
      const d = String(target.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}T11:00`;
    }

    beforeAll(async () => {
      const bellem = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
      bellemClinicId = bellem.id;
      const limpieza = await prisma.treatment.findFirstOrThrow({
        where: { clinicId: bellemClinicId, slug: "limpieza-facial" },
      });
      bellemTreatmentId = limpieza.id;
      const diana = await prisma.technician.findFirstOrThrow({
        where: { clinicId: bellemClinicId, name: "Diana" },
      });
      bellemTechnicianId = diana.id;
      // Reuse a seeded demo patient.
      const lucia = await prisma.patient.findFirstOrThrow({
        where: { clinicId: bellemClinicId, phone: "+34611700001" },
      });
      bellemPatientId = lucia.id;

      // Pre-cleanup of stale test rows from prior runs.
      await prisma.appointment.deleteMany({
        where: { clinicId: bellemClinicId, notes: NOTES_MARKER },
      });
    });

    afterAll(async () => {
      // Post-cleanup so we don't pile up appointments across reruns.
      await prisma.appointment.deleteMany({
        where: { clinicId: bellemClinicId, notes: NOTES_MARKER },
      });
    });

    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await createAppointmentAction({
        patientId: bellemPatientId,
        treatmentId: bellemTreatmentId,
        technicianId: bellemTechnicianId,
        startsAtLocal: futureWeekdayLocal(),
      });
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns VALIDATION_ERROR on malformed datetime", async () => {
      mockSession(bellemClinicId);
      const res = await createAppointmentAction({
        patientId: bellemPatientId,
        treatmentId: bellemTreatmentId,
        technicianId: bellemTechnicianId,
        startsAtLocal: "tomorrow at 11am",
      });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("happy path: creates a STAFF-tagged appointment", async () => {
      mockSession(bellemClinicId);
      const res = await createAppointmentAction({
        patientId: bellemPatientId,
        treatmentId: bellemTreatmentId,
        technicianId: bellemTechnicianId,
        startsAtLocal: futureWeekdayLocal(),
        notes: NOTES_MARKER,
      });
      expect(res.ok).toBe(true);
      expect(res.ok === true && res.appointmentId).toBeTruthy();

      const apptId = (res as { appointmentId: string }).appointmentId;
      const persisted = await prisma.appointment.findUniqueOrThrow({ where: { id: apptId } });
      expect(persisted.createdBy).toBe("STAFF");
      expect(persisted.patientId).toBe(bellemPatientId);
      expect(persisted.notes).toBe(NOTES_MARKER);
    });

    it("rejects an overlap on the same technician/slot", async () => {
      mockSession(bellemClinicId);
      const slot = futureWeekdayLocal();

      // First booking — should succeed.
      const first = await createAppointmentAction({
        patientId: bellemPatientId,
        treatmentId: bellemTreatmentId,
        technicianId: bellemTechnicianId,
        startsAtLocal: slot,
        notes: NOTES_MARKER,
      });
      // Either succeeds (first appointment for that slot) or hits OVERLAP
      // because the previous test already booked it — both are fine.
      // We just need the SECOND identical call to fail with an overlap.
      void first;

      const second = await createAppointmentAction({
        patientId: bellemPatientId,
        treatmentId: bellemTreatmentId,
        technicianId: bellemTechnicianId,
        startsAtLocal: slot,
        notes: NOTES_MARKER,
      });
      expect(second.ok).toBe(false);
      // bookAppointment surfaces BookingError "OVERLAP" for technician/slot clashes.
      expect(second.ok === false && second.error.code).toBe("OVERLAP");
    });
  });
});
