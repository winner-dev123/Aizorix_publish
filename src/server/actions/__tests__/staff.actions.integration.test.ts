/**
 * Integration tests for the Phase 6.4 staff actions.
 *
 *   - inviteStaffAction:    auth/role gates, validation, create + reactivate
 *                           paths, ALREADY_ACTIVE, magic-link send
 *   - setStaffActiveAction: SELF_LOCKOUT, LAST_OWNER guard, happy path
 *   - setStaffRoleAction:   non-OWNER cannot touch OWNER, LAST_OWNER guard,
 *                           happy path
 *
 * Mocks @/auth's `auth()` so we can inject a deterministic session, and
 * `signIn` so we don't actually try to send email through Nodemailer
 * during tests. Mocks next/cache for revalidatePath, same as other action
 * test files.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../../db";
import {
  inviteStaffAction,
  resendStaffInviteAction,
  setStaffActiveAction,
  setStaffRoleAction,
} from "../staff";
import { auth, signIn } from "@/auth";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

type SessionRole = "OWNER" | "ADMIN" | "RECEPTIONIST" | "STAFF";

function mockSession(clinicId: string, userId: string, role: SessionRole = "OWNER") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: userId, clinicId, role, email: "owner@test" },
    expires: "2999-01-01T00:00:00.000Z",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describeMaybe("staff server actions (DB)", () => {
  let clinicId: string;
  let ownerUserId: string;
  let staffUserId: string;
  const ownerEmail = "owner@test-staff.demo";
  const staffEmail = "staff@test-staff.demo";

  beforeAll(async () => {
    await prisma.clinic.deleteMany({ where: { slug: "test-staff-actions" } });

    const clinic = await prisma.clinic.create({
      data: {
        name: "Staff Actions Test",
        slug: "test-staff-actions",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
    });
    clinicId = clinic.id;

    const owner = await prisma.user.create({
      data: { clinicId, email: ownerEmail, role: "OWNER", active: true, name: "Owner" },
    });
    ownerUserId = owner.id;

    const staff = await prisma.user.create({
      data: { clinicId, email: staffEmail, role: "STAFF", active: true, name: "Staff" },
    });
    staffUserId = staff.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(signIn).mockReset();
    // Default: signIn resolves with a fake URL so the action's try/catch is
    // happy. Individual tests can override to simulate transport failures.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(signIn).mockResolvedValue("ok" as any);
  });

  // ---------- inviteStaffAction ----------

  describe("inviteStaffAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await inviteStaffAction({ email: "new@test", role: "STAFF" });
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns FORBIDDEN for RECEPTIONIST/STAFF roles", async () => {
      mockSession(clinicId, ownerUserId, "STAFF");
      const res = await inviteStaffAction({ email: "new@test", role: "STAFF" });
      expect(res.ok === false && res.error.code).toBe("FORBIDDEN");
    });

    it("rejects invalid emails", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      const res = await inviteStaffAction({ email: "not-an-email", role: "STAFF" });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("ALREADY_ACTIVE when reinviting an active user", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      const res = await inviteStaffAction({ email: staffEmail, role: "STAFF" });
      expect(res.ok === false && res.error.code).toBe("ALREADY_ACTIVE");
    });

    it("happy path: creates user + triggers signIn", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      const newEmail = "fresh@test-staff.demo";

      const res = await inviteStaffAction({
        email: newEmail,
        role: "RECEPTIONIST",
        name: "Fresh User",
      });
      expect(res.ok).toBe(true);
      expect(signIn).toHaveBeenCalledWith("nodemailer", { email: newEmail, redirect: false });

      const created = await prisma.user.findFirst({
        where: { clinicId, email: newEmail },
      });
      expect(created).not.toBeNull();
      expect(created!.role).toBe("RECEPTIONIST");
      expect(created!.active).toBe(true);
      expect(created!.name).toBe("Fresh User");
    });

    it("reactivates an inactive user instead of erroring", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      // Pre-deactivate the staff row.
      await prisma.user.update({ where: { id: staffUserId }, data: { active: false } });

      const res = await inviteStaffAction({
        email: staffEmail,
        role: "ADMIN",
        name: "Promoted Staff",
      });
      expect(res.ok).toBe(true);

      const after = await prisma.user.findUniqueOrThrow({ where: { id: staffUserId } });
      expect(after.active).toBe(true);
      expect(after.role).toBe("ADMIN");
      expect(after.name).toBe("Promoted Staff");
    });

    it("returns INVITE_EMAIL_FAILED but keeps the user when signIn throws", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      vi.mocked(signIn).mockRejectedValueOnce(new Error("smtp down"));
      const email = "smtp-fails@test-staff.demo";

      const res = await inviteStaffAction({ email, role: "STAFF" });
      expect(res.ok === false && res.error.code).toBe("INVITE_EMAIL_FAILED");

      // The user row should still exist — they just didn't get the email.
      const created = await prisma.user.findFirst({ where: { clinicId, email } });
      expect(created).not.toBeNull();
      expect(created!.active).toBe(true);
    });
  });

  // ---------- setStaffActiveAction ----------

  describe("setStaffActiveAction", () => {
    it("returns SELF_LOCKOUT when deactivating self", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      const res = await setStaffActiveAction(ownerUserId, false);
      expect(res.ok === false && res.error.code).toBe("SELF_LOCKOUT");
    });

    it("returns LAST_OWNER when deactivating the only active OWNER", async () => {
      // Make sure we're in a one-OWNER state: reactivate owner + deactivate
      // any extras from previous tests.
      await prisma.user.update({ where: { id: ownerUserId }, data: { active: true } });
      await prisma.user.updateMany({
        where: { clinicId, role: "OWNER", id: { not: ownerUserId } },
        data: { active: false },
      });

      // Sign in as an ADMIN so we can attempt to deactivate the owner.
      const admin = await prisma.user.create({
        data: { clinicId, email: "admin-attacker@test-staff.demo", role: "ADMIN", active: true },
      });
      mockSession(clinicId, admin.id, "ADMIN");

      const res = await setStaffActiveAction(ownerUserId, false);
      expect(res.ok === false && res.error.code).toBe("LAST_OWNER");

      // Cleanup.
      await prisma.user.delete({ where: { id: admin.id } });
    });

    it("happy path: flips active off and back on", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      // Ensure staff is active first.
      await prisma.user.update({ where: { id: staffUserId }, data: { active: true } });

      const r1 = await setStaffActiveAction(staffUserId, false);
      expect(r1.ok).toBe(true);
      const after1 = await prisma.user.findUniqueOrThrow({ where: { id: staffUserId } });
      expect(after1.active).toBe(false);

      const r2 = await setStaffActiveAction(staffUserId, true);
      expect(r2.ok).toBe(true);
      const after2 = await prisma.user.findUniqueOrThrow({ where: { id: staffUserId } });
      expect(after2.active).toBe(true);
    });
  });

  // ---------- setStaffRoleAction ----------

  describe("setStaffRoleAction", () => {
    it("FORBIDDEN when a non-OWNER tries to demote an OWNER", async () => {
      // Create a second OWNER so the LAST_OWNER guard doesn't fire first.
      const owner2 = await prisma.user.create({
        data: { clinicId, email: "owner2@test-staff.demo", role: "OWNER", active: true },
      });
      const admin = await prisma.user.create({
        data: { clinicId, email: "admin2@test-staff.demo", role: "ADMIN", active: true },
      });
      mockSession(clinicId, admin.id, "ADMIN");

      const res = await setStaffRoleAction({ userId: owner2.id, role: "ADMIN" });
      expect(res.ok === false && res.error.code).toBe("FORBIDDEN");

      await prisma.user.delete({ where: { id: owner2.id } });
      await prisma.user.delete({ where: { id: admin.id } });
    });

    it("LAST_OWNER when demoting the only active OWNER", async () => {
      // One-OWNER state.
      await prisma.user.update({ where: { id: ownerUserId }, data: { active: true } });
      await prisma.user.updateMany({
        where: { clinicId, role: "OWNER", id: { not: ownerUserId } },
        data: { active: false },
      });

      mockSession(clinicId, ownerUserId, "OWNER");
      const res = await setStaffRoleAction({ userId: ownerUserId, role: "ADMIN" });
      expect(res.ok === false && res.error.code).toBe("LAST_OWNER");
    });

    it("happy path: promotes STAFF to ADMIN", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      // Reset staff to STAFF role for a clean assertion.
      await prisma.user.update({ where: { id: staffUserId }, data: { role: "STAFF" } });

      const res = await setStaffRoleAction({ userId: staffUserId, role: "ADMIN" });
      expect(res.ok).toBe(true);

      const after = await prisma.user.findUniqueOrThrow({ where: { id: staffUserId } });
      expect(after.role).toBe("ADMIN");
    });
  });

  // ---------- resendStaffInviteAction ----------

  describe("resendStaffInviteAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await resendStaffInviteAction(ownerUserId);
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns FORBIDDEN for STAFF role", async () => {
      mockSession(clinicId, ownerUserId, "STAFF");
      const res = await resendStaffInviteAction(ownerUserId);
      expect(res.ok === false && res.error.code).toBe("FORBIDDEN");
    });

    it("returns NOT_FOUND for a missing / cross-tenant user", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      const res = await resendStaffInviteAction("ghost-id");
      expect(res.ok === false && res.error.code).toBe("NOT_FOUND");
    });

    it("returns INACTIVE_USER when the user is deactivated", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      await prisma.user.update({ where: { id: staffUserId }, data: { active: false } });
      const res = await resendStaffInviteAction(staffUserId);
      expect(res.ok === false && res.error.code).toBe("INACTIVE_USER");
      // Cleanup for the next tests.
      await prisma.user.update({ where: { id: staffUserId }, data: { active: true } });
    });

    it("happy path: calls signIn with the user's email", async () => {
      mockSession(clinicId, ownerUserId, "OWNER");
      const res = await resendStaffInviteAction(staffUserId);
      expect(res.ok).toBe(true);
      expect(signIn).toHaveBeenCalledWith("nodemailer", {
        email: staffEmail,
        redirect: false,
      });
    });
  });
});
