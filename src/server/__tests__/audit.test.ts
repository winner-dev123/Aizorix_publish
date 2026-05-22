/**
 * Tests for the audit-log helper. Verifies:
 *  - logAudit writes a row with the expected shape
 *  - getRecentAuditLogs returns rows most-recent first, scoped by clinic
 *  - log failures don't throw (audit shouldn't break the caller)
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../db";
import { getRecentAuditLogs, logAudit } from "../audit";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("audit log helper (DB)", () => {
  let clinicId: string;
  let otherClinicId: string;

  beforeAll(async () => {
    await prisma.clinic.deleteMany({
      where: { slug: { in: ["test-audit-a", "test-audit-b"] } },
    });
    const a = await prisma.clinic.create({
      data: {
        slug: "test-audit-a",
        name: "Audit Test A",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
    });
    const b = await prisma.clinic.create({
      data: {
        slug: "test-audit-b",
        name: "Audit Test B",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
    });
    clinicId = a.id;
    otherClinicId = b.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: [clinicId, otherClinicId] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicId, otherClinicId] } } });
    await prisma.$disconnect();
  });

  it("writes a row with the expected shape", async () => {
    await logAudit({
      clinicId,
      actorUserId: null,
      action: "test.event",
      target: "test:1",
      metadata: { foo: "bar", n: 42 },
    });
    const row = await prisma.auditLog.findFirst({
      where: { clinicId, action: "test.event" },
      orderBy: { createdAt: "desc" },
    });
    expect(row).not.toBeNull();
    expect(row!.target).toBe("test:1");
    expect(row!.actorUserId).toBeNull();
    expect(row!.metadata).toMatchObject({ foo: "bar", n: 42 });
  });

  it("getRecentAuditLogs returns most-recent first, clinic-scoped", async () => {
    // Add a couple more rows in clinic A and one in clinic B.
    await logAudit({ clinicId, actorUserId: null, action: "test.first" });
    await logAudit({ clinicId, actorUserId: null, action: "test.second" });
    await logAudit({ clinicId: otherClinicId, actorUserId: null, action: "test.other_clinic" });

    const aResult = await getRecentAuditLogs(clinicId, 50);
    // Order: most-recent first.
    expect(aResult.rows[0]!.action).toBe("test.second");
    expect(aResult.rows.some((l) => l.action === "test.other_clinic")).toBe(false);

    const bResult = await getRecentAuditLogs(otherClinicId, 50);
    expect(bResult.rows.some((l) => l.action === "test.other_clinic")).toBe(true);
    expect(bResult.rows.some((l) => l.action === "test.first")).toBe(false);
  });

  it("log failures never throw (caller-friendly)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Force a failure by passing an FK that doesn't exist; logAudit should
    // swallow the error and resolve normally.
    await expect(
      logAudit({
        clinicId: "ghost-clinic-id",
        actorUserId: null,
        action: "test.should_swallow",
      }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
