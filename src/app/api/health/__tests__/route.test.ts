/**
 * Integration test for the /api/health probe.
 *
 * Calls the route handler directly (no Next.js dev server needed) and
 * verifies it returns 200 with a sensible JSON shape when the database
 * is reachable. Skipped without DATABASE_URL.
 */
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "../route";
import { prisma } from "../../../../server/db";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("/api/health (DB)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 200 with status:ok when the DB is reachable", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(typeof body.latencyMs).toBe("number");
    expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof body.timestamp).toBe("string");
    // ISO-8601 sanity check.
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
