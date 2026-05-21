/**
 * Tests for assertModuleActive — the page-level module gate.
 *
 * Strategy: mock next/navigation's `redirect` so the function returns
 * normally + records the target URL, then exercise the three branches:
 *   - clinic not found            → redirect("/signin")
 *   - module not in activeModules → redirect("/app/settings/modulos")
 *   - module in activeModules     → no redirect (returns)
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted to the top of the file — anything it closes over must
// either come from `vi.hoisted` or be defined inside the factory. We pull
// the spy back via vi.mocked(redirect) after imports.
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { redirect } from "next/navigation";
import { prisma } from "../../db";
import { assertModuleActive } from "../guard";

const redirectMock = vi.mocked(redirect);

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("assertModuleActive (DB)", () => {
  let clinicId: string;

  beforeAll(async () => {
    await prisma.clinic.deleteMany({ where: { slug: "test-guard" } });
    const clinic = await prisma.clinic.create({
      data: {
        slug: "test-guard",
        name: "Guard Test Clinic",
        timezone: "Europe/Madrid",
        locale: "es-ES",
        activeModules: ["pipeline", "metrics"],
      },
    });
    clinicId = clinic.id;
  });

  afterAll(async () => {
    await prisma.clinic.deleteMany({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    redirectMock.mockReset();
  });

  afterEach(() => {
    redirectMock.mockReset();
  });

  it("redirects to /signin when the clinic is not found", async () => {
    await assertModuleActive("clinic-that-does-not-exist", "pipeline");
    expect(redirectMock).toHaveBeenCalledWith("/signin");
  });

  it("redirects to /app/settings/modulos?disabled=<key> when the module is disabled", async () => {
    // "campaigns" is NOT in the seeded activeModules array.
    await assertModuleActive(clinicId, "campaigns");
    expect(redirectMock).toHaveBeenCalledWith("/app/settings/modulos?disabled=campaigns");
  });

  it("returns without redirecting when the module is enabled", async () => {
    await assertModuleActive(clinicId, "pipeline");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ignores stale/unknown keys in the DB array — disabled if not in catalogue", async () => {
    await prisma.clinic.update({
      where: { id: clinicId },
      data: { activeModules: ["pipeline", "stale-legacy-key"] },
    });
    // pipeline still enabled
    await assertModuleActive(clinicId, "pipeline");
    expect(redirectMock).not.toHaveBeenCalled();

    // metrics removed → redirect
    redirectMock.mockReset();
    await assertModuleActive(clinicId, "metrics");
    expect(redirectMock).toHaveBeenCalledWith("/app/settings/modulos?disabled=metrics");

    // restore for any subsequent runs
    await prisma.clinic.update({
      where: { id: clinicId },
      data: { activeModules: ["pipeline", "metrics"] },
    });
  });
});
