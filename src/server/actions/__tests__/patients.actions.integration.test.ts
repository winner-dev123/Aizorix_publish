/**
 * Integration tests for createPatientAction.
 *
 * Uses a dedicated test clinic so the seeded Bellem patients stay clean.
 * Mocks @/auth + next/cache (same pattern as the other action tests).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../../db";
import { createPatientAction, updatePatientAction } from "../patients";
import { auth } from "@/auth";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

function mockSession(clinicId: string) {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "test-staff", clinicId, role: "OWNER", email: "test@example.com" },
    expires: "2999-01-01T00:00:00.000Z",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describeMaybe("createPatientAction (DB)", () => {
  let clinicId: string;

  beforeAll(async () => {
    await prisma.clinic.deleteMany({ where: { slug: "test-patients-actions" } });
    const clinic = await prisma.clinic.create({
      data: {
        slug: "test-patients-actions",
        name: "Patients Actions Test",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
    });
    clinicId = clinic.id;
  });

  afterAll(async () => {
    // Cascade deletes patients via Patient.clinicId onDelete: Cascade.
    await prisma.clinic.deleteMany({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("returns UNAUTHORIZED when no session", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await createPatientAction({
      firstName: "Test",
      phone: "+34611700700",
    });
    expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects malformed phone (not E.164)", async () => {
    mockSession(clinicId);
    const res = await createPatientAction({
      firstName: "Test",
      phone: "611-700-701",
    });
    expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects malformed email", async () => {
    mockSession(clinicId);
    const res = await createPatientAction({
      firstName: "Test",
      phone: "+34611700702",
      email: "not-an-email",
    });
    expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
  });

  it("happy path: creates a LEAD with all optional fields", async () => {
    mockSession(clinicId);
    const res = await createPatientAction({
      firstName: "Laura",
      lastName: "García",
      phone: "+34611700703",
      email: "Laura.Garcia@Example.com",
      gender: "FEMALE",
      dob: "1990-03-15",
      source: "Instagram",
      notes: "  Viene recomendada por Carmen.  ",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const created = await prisma.patient.findUniqueOrThrow({ where: { id: res.data.patientId } });
    expect(created.firstName).toBe("Laura");
    expect(created.lastName).toBe("García");
    expect(created.phone).toBe("+34611700703");
    // Email lowercased per zod transform.
    expect(created.email).toBe("laura.garcia@example.com");
    expect(created.gender).toBe("FEMALE");
    expect(created.dob?.toISOString().slice(0, 10)).toBe("1990-03-15");
    expect(created.source).toBe("Instagram");
    // Notes trimmed.
    expect(created.notes).toBe("Viene recomendada por Carmen.");
    expect(created.status).toBe("LEAD");
  });

  it("empty optional fields are stored as NULL", async () => {
    mockSession(clinicId);
    const res = await createPatientAction({
      firstName: "Solo",
      phone: "+34611700704",
      lastName: "",
      email: "",
      gender: "",
      dob: "",
      source: "",
      notes: "",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const created = await prisma.patient.findUniqueOrThrow({ where: { id: res.data.patientId } });
    expect(created.lastName).toBeNull();
    expect(created.email).toBeNull();
    expect(created.gender).toBeNull();
    expect(created.dob).toBeNull();
    expect(created.source).toBeNull();
    expect(created.notes).toBeNull();
  });

  it("ALREADY_EXISTS when phone is already in use for this clinic", async () => {
    mockSession(clinicId);
    // Use the same phone as the happy-path test.
    const res = await createPatientAction({
      firstName: "Duplicado",
      phone: "+34611700703",
    });
    expect(res.ok === false && res.error.code).toBe("ALREADY_EXISTS");
  });

  // ---------- updatePatientAction ----------

  describe("updatePatientAction", () => {
    let editTargetId: string;

    beforeAll(async () => {
      const a = await prisma.patient.create({
        data: {
          clinicId,
          firstName: "EditMe",
          lastName: "Original",
          phone: "+34611700801",
          status: "LEAD",
        },
      });
      editTargetId = a.id;
      // Second patient exists for the "ALREADY_EXISTS on phone change" test —
      // referenced by its phone number, not by id.
      await prisma.patient.create({
        data: {
          clinicId,
          firstName: "Other",
          phone: "+34611700802",
          status: "LEAD",
        },
      });
    });

    it("returns NOT_FOUND for a cross-tenant or missing patient id", async () => {
      mockSession(clinicId);
      const res = await updatePatientAction("ghost-id", {
        firstName: "X",
        phone: "+34611700801",
        status: "LEAD",
      });
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("happy path: updates fields and changes status", async () => {
      mockSession(clinicId);
      const res = await updatePatientAction(editTargetId, {
        firstName: "EditMe",
        lastName: "Actualizada",
        phone: "+34611700801", // unchanged → uniqueness check skipped
        email: "edit@example.com",
        gender: "FEMALE",
        dob: "1995-02-10",
        source: "Recomendación",
        notes: "Actualizada",
        status: "ACTIVE",
      });
      expect(res.ok).toBe(true);
      const after = await prisma.patient.findUniqueOrThrow({ where: { id: editTargetId } });
      expect(after.lastName).toBe("Actualizada");
      expect(after.email).toBe("edit@example.com");
      expect(after.gender).toBe("FEMALE");
      expect(after.dob?.toISOString().slice(0, 10)).toBe("1995-02-10");
      expect(after.status).toBe("ACTIVE");
    });

    it("ALREADY_EXISTS when changing phone to another patient's phone", async () => {
      mockSession(clinicId);
      const res = await updatePatientAction(editTargetId, {
        firstName: "EditMe",
        phone: "+34611700802", // belongs to the OTHER patient
        status: "ACTIVE",
      });
      expect(res.ok === false && res.error.code).toBe("ALREADY_EXISTS");
      // Confirm we didn't half-write — original phone is intact.
      const after = await prisma.patient.findUniqueOrThrow({ where: { id: editTargetId } });
      expect(after.phone).toBe("+34611700801");
    });

    it("allows keeping the same phone without tripping ALREADY_EXISTS", async () => {
      mockSession(clinicId);
      const res = await updatePatientAction(editTargetId, {
        firstName: "EditMe",
        phone: "+34611700801", // same as current
        status: "ACTIVE",
      });
      expect(res.ok).toBe(true);
    });
  });
});
