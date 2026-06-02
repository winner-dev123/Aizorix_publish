/**
 * Integration tests for POST /api/v1/patients — exercises the full path:
 * Bearer-token auth (real DB lookup) → Zod validation → Prisma write →
 * audit log entry. Skipped without DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("POST /api/v1/patients (integration)", () => {
  let prisma: PrismaClient;
  let POST: typeof import("../route").POST;
  let clinicId: string;
  let tokenId: string;
  let rawToken: string;
  // Track every phone we insert so the afterAll teardown can remove
  // them without nuking unrelated rows on a shared dev DB.
  const createdPhones: string[] = [];

  beforeAll(async () => {
    prisma = (await import("../../../../../server/db")).prisma;
    POST = (await import("../route")).POST;
    const apiAuth = await import("../../../../../server/api-auth");

    const clinic = await prisma.clinic.findUniqueOrThrow({
      where: { slug: "bellem" },
    });
    clinicId = clinic.id;

    rawToken = apiAuth.generateRawToken();
    const created = await prisma.apiToken.create({
      data: {
        clinicId,
        tokenHash: apiAuth.hashToken(rawToken),
        prefix: apiAuth.tokenPrefix(rawToken),
        name: "Test integration token",
        scopes: ["full"],
      },
      select: { id: true },
    });
    tokenId = created.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    if (createdPhones.length > 0) {
      await prisma.patient.deleteMany({
        where: { clinicId, phone: { in: createdPhones } },
      });
    }
    if (tokenId) {
      await prisma.apiToken.delete({ where: { id: tokenId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  function makeReq(body: unknown, opts?: { auth?: string | null }) {
    const headers = new Headers({ "content-type": "application/json" });
    if (opts?.auth !== null) {
      headers.set("authorization", opts?.auth ?? `Bearer ${rawToken}`);
    }
    return new NextRequest("http://localhost/api/v1/patients", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("rejects missing Authorization header with 401", async () => {
    const res = await POST(makeReq({ firstName: "x", phone: "+34611000201" }, { auth: null }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("missing_token");
  });

  it("rejects malformed Bearer token with 401", async () => {
    const res = await POST(
      makeReq({ firstName: "x", phone: "+34611000202" }, { auth: "Bearer not_a_real_token" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects valid token from a different clinic context (token revoked)", async () => {
    // Delete the token and confirm the next call fails.
    const apiAuth = await import("../../../../../server/api-auth");
    const otherRaw = apiAuth.generateRawToken();
    const otherToken = await prisma.apiToken.create({
      data: {
        clinicId,
        tokenHash: apiAuth.hashToken(otherRaw),
        prefix: apiAuth.tokenPrefix(otherRaw),
        name: "Revoked-during-test",
        scopes: ["full"],
      },
      select: { id: true },
    });
    await prisma.apiToken.delete({ where: { id: otherToken.id } });

    const res = await POST(
      makeReq({ firstName: "x", phone: "+34611000203" }, { auth: `Bearer ${otherRaw}` }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_token");
  });

  it("rejects expired tokens with 401 + token_expired code", async () => {
    const apiAuth = await import("../../../../../server/api-auth");
    const expiredRaw = apiAuth.generateRawToken();
    const expired = await prisma.apiToken.create({
      data: {
        clinicId,
        tokenHash: apiAuth.hashToken(expiredRaw),
        prefix: apiAuth.tokenPrefix(expiredRaw),
        name: "Expired-token",
        scopes: ["full"],
        expiresAt: new Date(Date.now() - 60_000),
      },
      select: { id: true },
    });
    const res = await POST(
      makeReq({ firstName: "x", phone: "+34611000204" }, { auth: `Bearer ${expiredRaw}` }),
    );
    await prisma.apiToken.delete({ where: { id: expired.id } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("token_expired");
  });

  it("rejects invalid JSON body with 400", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      authorization: `Bearer ${rawToken}`,
    });
    const req = new NextRequest("http://localhost/api/v1/patients", {
      method: "POST",
      headers,
      body: "not json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_json");
  });

  it("rejects bodies that fail Zod validation with 422 + issues", async () => {
    const res = await POST(makeReq({ firstName: "", phone: "not-a-phone" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
    expect(Array.isArray(body.error.issues)).toBe(true);
    expect(body.error.issues.length).toBeGreaterThan(0);
  });

  it("creates a patient on the happy path and returns 201 with the row", async () => {
    const phone = `+346110099${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    createdPhones.push(phone);
    const res = await POST(
      makeReq({
        firstName: "Laura",
        lastName: "García",
        phone,
        email: "laura@example.com",
        dob: "1990-04-12",
        notes: "From HubSpot test",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.firstName).toBe("Laura");
    expect(body.lastName).toBe("García");
    expect(body.phone).toBe(phone);
    expect(body.email).toBe("laura@example.com");
    expect(body.dob).toBe("1990-04-12");
    expect(body.status).toBe("LEAD");
    expect(body.source).toBe("api");
    expect(typeof body.id).toBe("string");

    // Verify the row actually landed.
    const row = await prisma.patient.findUnique({
      where: { clinicId_phone: { clinicId, phone } },
      select: { id: true, source: true },
    });
    expect(row?.id).toBe(body.id);
    expect(row?.source).toBe("api");

    // Verify audit log was written.
    const audit = await prisma.auditLog.findFirst({
      where: { clinicId, target: `patient:${body.id}`, action: "patient.created" },
    });
    expect(audit).not.toBeNull();
    expect((audit?.metadata as { via?: string })?.via).toContain("api-token:");
  });

  it("returns 409 + already_exists on duplicate phone (same clinic)", async () => {
    const phone = `+346110099${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    createdPhones.push(phone);

    const first = await POST(
      makeReq({ firstName: "First", phone, source: "test" }),
    );
    expect(first.status).toBe(201);

    const second = await POST(
      makeReq({ firstName: "Second", phone, source: "test" }),
    );
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe("already_exists");
    expect(typeof body.error.patientId).toBe("string");
  });
});
