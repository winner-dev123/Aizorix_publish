/**
 * Integration tests for the AI-memory editing actions.
 *
 *   - upsertMemoryAction: auth gate, clinic scope, validation (key/value
 *                         shape), upsert semantics (last-write-wins).
 *   - deleteMemoryAction: clinic scope, idempotent delete.
 *
 * Uses the seeded Bellem clinic + a brand-new patient we create here so we
 * don't disturb any existing memory rows.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../../db";
import { upsertMemoryAction, deleteMemoryAction } from "../memories";
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

describeMaybe("memory editing actions (DB)", () => {
  let clinicId: string;
  let patientId: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;

    // Dedicated patient — wipe leftover memories from any previous run.
    const phone = "+34611900900";
    const existing = await prisma.patient.findFirst({ where: { clinicId, phone } });
    if (existing) {
      await prisma.aiMemory.deleteMany({ where: { patientId: existing.id } });
      patientId = existing.id;
    } else {
      const p = await prisma.patient.create({
        data: {
          clinicId,
          firstName: "MemTest",
          lastName: "Patient",
          phone,
          status: "ACTIVE",
        },
      });
      patientId = p.id;
    }
  });

  afterAll(async () => {
    await prisma.aiMemory.deleteMany({ where: { patientId } });
    await prisma.patient.deleteMany({ where: { id: patientId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  // ---------- upsertMemoryAction ----------

  describe("upsertMemoryAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await upsertMemoryAction({
        patientId,
        key: "preferred_technician",
        value: "Diana",
      });
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns NOT_FOUND for a cross-tenant / missing patient id", async () => {
      mockSession(clinicId);
      const res = await upsertMemoryAction({
        patientId: "ghost-id",
        key: "preferred_technician",
        value: "Diana",
      });
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("rejects keys with spaces or accents", async () => {
      mockSession(clinicId);
      const res = await upsertMemoryAction({
        patientId,
        key: "técnica preferida",
        value: "Diana",
      });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects values longer than 500 chars", async () => {
      mockSession(clinicId);
      const res = await upsertMemoryAction({
        patientId,
        key: "huge_note",
        value: "x".repeat(501),
      });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("happy path: creates a new memory row", async () => {
      mockSession(clinicId);
      const res = await upsertMemoryAction({
        patientId,
        key: "preferred_technician",
        value: "Diana",
      });
      expect(res.ok).toBe(true);
      const row = await prisma.aiMemory.findUnique({
        where: { patientId_key: { patientId, key: "preferred_technician" } },
      });
      expect(row?.value).toBe("Diana");
    });

    it("upsert: a second call with the same key overwrites the value", async () => {
      mockSession(clinicId);
      await upsertMemoryAction({ patientId, key: "preferred_technician", value: "Diana" });
      const res = await upsertMemoryAction({
        patientId,
        key: "preferred_technician",
        value: "Isis",
      });
      expect(res.ok).toBe(true);
      const row = await prisma.aiMemory.findUniqueOrThrow({
        where: { patientId_key: { patientId, key: "preferred_technician" } },
      });
      expect(row.value).toBe("Isis");
    });
  });

  // ---------- deleteMemoryAction ----------

  describe("deleteMemoryAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await deleteMemoryAction({ patientId, key: "preferred_technician" });
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns NOT_FOUND for a cross-tenant patient", async () => {
      mockSession(clinicId);
      const res = await deleteMemoryAction({ patientId: "ghost-id", key: "preferred_technician" });
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("happy path: deletes the row", async () => {
      mockSession(clinicId);
      await upsertMemoryAction({ patientId, key: "to_delete", value: "x" });
      const res = await deleteMemoryAction({ patientId, key: "to_delete" });
      expect(res.ok).toBe(true);
      const row = await prisma.aiMemory.findUnique({
        where: { patientId_key: { patientId, key: "to_delete" } },
      });
      expect(row).toBeNull();
    });

    it("is idempotent — deleting a non-existent key returns ok", async () => {
      mockSession(clinicId);
      const res = await deleteMemoryAction({ patientId, key: "never_existed" });
      expect(res.ok).toBe(true);
    });
  });
});
