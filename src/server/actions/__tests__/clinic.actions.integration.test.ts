/**
 * Integration tests for the Phase 6 settings server actions.
 *
 *   - updateClinicAction:        validation, role gate, WHATSAPP_TAKEN
 *   - updateBusinessHoursAction: validation, overlap detection, replace-all
 *   - updateAiConfigAction:      tone enum + guidance trim/null
 *
 * Uses a dedicated test clinic so Bellem stays clean. Mocks @/auth so the
 * action's session lookup returns a deterministic user.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
// revalidatePath needs Next.js's static-generation context, which doesn't
// exist in vitest. Stub it — the actions only use it for cache busting.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../../db";
import {
  updateActiveModulesAction,
  updateAiConfigAction,
  updateBusinessHoursAction,
  updateClinicAction,
  updatePromptTemplateAction,
} from "../clinic";
import { auth } from "@/auth";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

type SessionRole = "OWNER" | "ADMIN" | "RECEPTIONIST" | "STAFF";

function mockSession(clinicId: string, role: SessionRole = "OWNER") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "test-admin", clinicId, role, email: "test@example.com" },
    expires: "2999-01-01T00:00:00.000Z",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describeMaybe("settings server actions (DB)", () => {
  let clinicId: string;
  let otherClinicId: string;
  const TAKEN_NUMBER = "+34911999900";

  beforeAll(async () => {
    // Wipe any prior leftovers from earlier failing test runs.
    await prisma.clinic.deleteMany({
      where: { slug: { in: ["test-actions-a", "test-actions-b"] } },
    });

    const a = await prisma.clinic.create({
      data: {
        name: "Settings Test A",
        slug: "test-actions-a",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        minLeadMinutes: 120,
        slotGranularityMin: 30,
      },
    });
    clinicId = a.id;

    const b = await prisma.clinic.create({
      data: {
        name: "Settings Test B",
        slug: "test-actions-b",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        whatsappNumber: TAKEN_NUMBER,
      },
    });
    otherClinicId = b.id;
  });

  afterAll(async () => {
    await prisma.clinicBusinessHours.deleteMany({ where: { clinicId } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicId, otherClinicId] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  // ---------- updateClinicAction ----------

  describe("updateClinicAction", () => {
    const baseInput = {
      name: "Renamed",
      timezone: "Europe/Madrid" as const,
      locale: "es-ES" as const,
      whatsappNumber: "",
      minLeadMinutes: 90,
      slotGranularityMin: 30,
    };

    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await updateClinicAction(baseInput);
      expect(res.ok).toBe(false);
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns FORBIDDEN for STAFF/RECEPTIONIST roles", async () => {
      mockSession(clinicId, "STAFF");
      const r1 = await updateClinicAction(baseInput);
      expect(r1.ok === false && r1.error.code).toBe("FORBIDDEN");

      mockSession(clinicId, "RECEPTIONIST");
      const r2 = await updateClinicAction(baseInput);
      expect(r2.ok === false && r2.error.code).toBe("FORBIDDEN");
    });

    it("rejects malformed WhatsApp number", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateClinicAction({ ...baseInput, whatsappNumber: "not-e164" });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns WHATSAPP_TAKEN when another clinic already holds the number", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateClinicAction({ ...baseInput, whatsappNumber: TAKEN_NUMBER });
      expect(res.ok === false && res.error.code).toBe("WHATSAPP_TAKEN");
    });

    it("happy path: writes the new clinic values", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateClinicAction({
        ...baseInput,
        name: "Settings Test A — Updated",
        minLeadMinutes: 60,
      });
      expect(res.ok).toBe(true);

      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.name).toBe("Settings Test A — Updated");
      expect(after.minLeadMinutes).toBe(60);
      // Blank WhatsApp number should map to null in the DB.
      expect(after.whatsappNumber).toBeNull();
    });
  });

  // ---------- updateBusinessHoursAction ----------

  describe("updateBusinessHoursAction", () => {
    it("rejects bad HH:mm format", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateBusinessHoursAction([
        { dayOfWeek: 1, opensAt: "9:0", closesAt: "20:00" },
      ]);
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects opens >= closes", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateBusinessHoursAction([
        { dayOfWeek: 1, opensAt: "20:00", closesAt: "09:00" },
      ]);
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("detects overlapping windows on the same day", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateBusinessHoursAction([
        { dayOfWeek: 1, opensAt: "09:00", closesAt: "14:00" },
        { dayOfWeek: 1, opensAt: "13:00", closesAt: "18:00" },
      ]);
      expect(res.ok === false && res.error.code).toBe("OVERLAP");
    });

    it("happy path: replaces all rows in one transaction", async () => {
      mockSession(clinicId, "OWNER");
      // First write: Mon morning + afternoon, Tue full day.
      const first = await updateBusinessHoursAction([
        { dayOfWeek: 1, opensAt: "09:30", closesAt: "14:00" },
        { dayOfWeek: 1, opensAt: "16:30", closesAt: "20:00" },
        { dayOfWeek: 2, opensAt: "09:30", closesAt: "20:00" },
      ]);
      expect(first.ok).toBe(true);
      const after1 = await prisma.clinicBusinessHours.findMany({
        where: { clinicId },
        orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }],
      });
      expect(after1).toHaveLength(3);

      // Second write replaces the first entirely (no Tue any more).
      const second = await updateBusinessHoursAction([
        { dayOfWeek: 1, opensAt: "10:00", closesAt: "19:00" },
      ]);
      expect(second.ok).toBe(true);
      const after2 = await prisma.clinicBusinessHours.findMany({ where: { clinicId } });
      expect(after2).toHaveLength(1);
      expect(after2[0]!.dayOfWeek).toBe(1);
      expect(after2[0]!.opensAt).toBe("10:00");

      // Empty array = clinic closed every day; deletes all.
      const third = await updateBusinessHoursAction([]);
      expect(third.ok).toBe(true);
      const after3 = await prisma.clinicBusinessHours.findMany({ where: { clinicId } });
      expect(after3).toHaveLength(0);
    });
  });

  // ---------- updateAiConfigAction ----------

  describe("updateAiConfigAction", () => {
    it("rejects guidance over 2000 chars", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateAiConfigAction({
        aiTone: "FORMAL",
        aiGuidance: "x".repeat(2001),
      });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("stores empty/whitespace guidance as null", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateAiConfigAction({ aiTone: "FORMAL", aiGuidance: "   \n  " });
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.aiTone).toBe("FORMAL");
      expect(after.aiGuidance).toBeNull();
    });

    it("trims surrounding whitespace on non-empty guidance", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateAiConfigAction({
        aiTone: "CASUAL",
        aiGuidance: "  Pide DNI siempre.  ",
      });
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.aiTone).toBe("CASUAL");
      expect(after.aiGuidance).toBe("Pide DNI siempre.");
    });
  });

  // ---------- updatePromptTemplateAction ----------

  describe("updatePromptTemplateAction", () => {
    it("returns FORBIDDEN for STAFF/RECEPTIONIST roles", async () => {
      mockSession(clinicId, "STAFF");
      const res = await updatePromptTemplateAction({ template: "x" });
      expect(res.ok === false && res.error.code).toBe("FORBIDDEN");
    });

    it("rejects templates over 16k chars", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updatePromptTemplateAction({ template: "x".repeat(16_001) });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("stores a non-empty template verbatim (trimmed)", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updatePromptTemplateAction({
        template: "  Custom prompt for {{clinic_name}}.  ",
      });
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.aiSystemPrompt).toBe("Custom prompt for {{clinic_name}}.");
    });

    it("treats an empty/whitespace template as 'reset to default' (stores null)", async () => {
      mockSession(clinicId, "OWNER");
      // First set a non-default value so we can prove the reset wipes it.
      await updatePromptTemplateAction({ template: "Custom prompt" });
      const mid = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(mid.aiSystemPrompt).toBe("Custom prompt");

      const res = await updatePromptTemplateAction({ template: "   " });
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.aiSystemPrompt).toBeNull();
    });

    it("accepts an explicit null payload (reset)", async () => {
      mockSession(clinicId, "OWNER");
      await updatePromptTemplateAction({ template: "Custom prompt" });
      const res = await updatePromptTemplateAction({ template: null });
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.aiSystemPrompt).toBeNull();
    });
  });

  // ---------- updateActiveModulesAction ----------

  describe("updateActiveModulesAction", () => {
    it("returns FORBIDDEN for RECEPTIONIST/STAFF roles", async () => {
      mockSession(clinicId, "STAFF");
      const res = await updateActiveModulesAction(["pipeline"]);
      expect(res.ok === false && res.error.code).toBe("FORBIDDEN");
    });

    it("replaces the array of active modules", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateActiveModulesAction(["pipeline", "metrics"]);
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.activeModules.sort()).toEqual(["metrics", "pipeline"]);
    });

    it("filters unknown keys and collapses duplicates", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateActiveModulesAction([
        "pipeline",
        "pipeline",
        "metrics",
        "made-up-key",
      ]);
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.activeModules.sort()).toEqual(["metrics", "pipeline"]);
    });

    it("accepts an empty array (clinic has all modules disabled)", async () => {
      mockSession(clinicId, "OWNER");
      const res = await updateActiveModulesAction([]);
      expect(res.ok).toBe(true);
      const after = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
      expect(after.activeModules).toEqual([]);
    });
  });
});
