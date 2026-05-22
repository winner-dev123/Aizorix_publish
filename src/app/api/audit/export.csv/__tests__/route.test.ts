/**
 * Tests for the audit CSV export route.
 *
 * Covers:
 *   - auth + role gates (401 / 403)
 *   - returns CSV with the expected headers + a row per audit entry
 *   - clinic-scoped (no leakage across tenants)
 *   - action filter narrows the result set
 *   - CSV escaping handles embedded quotes and commas
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import type { NextRequest } from "next/server";
import { GET } from "../route";
import { prisma } from "../../../../../server/db";
import { auth } from "@/auth";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

type SessionRole = "OWNER" | "ADMIN" | "RECEPTIONIST" | "STAFF";

function mockSession(clinicId: string, role: SessionRole = "OWNER") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "test-staff", clinicId, role, email: "test@example.com" },
    expires: "2999-01-01T00:00:00.000Z",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function makeRequest(query: Record<string, string> = {}): NextRequest {
  const params = new URLSearchParams(query);
  return {
    nextUrl: {
      searchParams: params,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describeMaybe("/api/audit/export.csv (DB)", () => {
  let clinicId: string;
  let otherClinicId: string;

  beforeAll(async () => {
    await prisma.clinic.deleteMany({
      where: { slug: { in: ["test-audit-csv-a", "test-audit-csv-b"] } },
    });

    const a = await prisma.clinic.create({
      data: {
        slug: "test-audit-csv-a",
        name: "Audit CSV A",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
    });
    clinicId = a.id;

    const b = await prisma.clinic.create({
      data: {
        slug: "test-audit-csv-b",
        name: "Audit CSV B",
        timezone: "Europe/Madrid",
        locale: "es-ES",
      },
    });
    otherClinicId = b.id;

    // Seed: 2 rows in clinic A (different actions), 1 row in clinic B.
    await prisma.auditLog.createMany({
      data: [
        {
          clinicId,
          actorUserId: null,
          action: "clinic.updated",
          target: `clinic:${clinicId}`,
          metadata: { name: "A, with comma" },
        },
        {
          clinicId,
          actorUserId: null,
          action: "patient.created",
          target: "patient:xyz",
          metadata: { phone: "+34611000000" },
        },
        {
          clinicId: otherClinicId,
          actorUserId: null,
          action: "clinic.updated",
          target: `clinic:${otherClinicId}`,
          metadata: { name: "other clinic" },
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: [clinicId, otherClinicId] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicId, otherClinicId] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("returns 401 when no session", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 for STAFF/RECEPTIONIST", async () => {
    mockSession(clinicId, "STAFF");
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("happy path: returns CSV with headers and clinic-scoped rows", async () => {
    mockSession(clinicId, "OWNER");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="aizorix-audit-/);

    const body = await res.text();
    const lines = body.trim().split("\n");
    // 1 header + 2 data rows (the 3rd row belongs to the other clinic).
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe(
      '"timestamp","action","actor_email","actor_name","target","metadata"',
    );
    // The body should NOT contain the other clinic's audit row.
    expect(body).not.toContain(`clinic:${otherClinicId}`);
  });

  it("respects the action filter", async () => {
    mockSession(clinicId, "OWNER");
    const res = await GET(makeRequest({ action: "patient.created" }));
    expect(res.status).toBe(200);
    const lines = (await res.text()).trim().split("\n");
    // 1 header + 1 data row.
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('"patient.created"');
    expect(lines[1]).toContain('"patient:xyz"');
  });

  it("escapes embedded commas + quotes in values", async () => {
    mockSession(clinicId, "OWNER");
    const res = await GET(makeRequest({ action: "clinic.updated" }));
    const body = await res.text();
    // The seeded metadata had "A, with comma" — the JSON-stringified form
    // contains a comma and double-quotes, which should be wrapped + escaped.
    expect(body).toContain('"{""name"":""A, with comma""}"');
  });
});
