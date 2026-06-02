/**
 * Tests for the security-critical primitives in src/server/admin/auth.ts.
 *
 * These do NOT touch the database — they cover the password hash format
 * and verification (scrypt) only. The cookie/session helpers depend on
 * Next's request context (cookies()) and are exercised by the broader
 * sign-in integration tests if you add them later.
 */
import { beforeAll, describe, expect, it } from "vitest";

// Provide AUTH_SECRET BEFORE importing the module so the module-scope
// secret check passes when other helpers are imported in the same suite.
beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-secret-for-admin-auth-unit-tests";
});

import { hashPassword, verifyPassword } from "../auth";

describe("admin/auth: password hashing (scrypt)", () => {
  it("hashPassword returns the salt:hash format with hex-only chars", async () => {
    const stored = await hashPassword("correct-horse-battery");
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    const [salt, hash] = stored.split(":");
    // 16 random bytes = 32 hex chars
    expect(salt.length).toBe(32);
    // 64-byte derived key = 128 hex chars
    expect(hash.length).toBe(128);
  });

  it("hashPassword yields a different output for the same input (salted)", async () => {
    const a = await hashPassword("samepassword12");
    const b = await hashPassword("samepassword12");
    expect(a).not.toBe(b);
  });

  it("hashPassword rejects passwords shorter than 8 chars", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/8 characters/);
  });

  it("verifyPassword accepts the original password", async () => {
    const stored = await hashPassword("S3cure!password-2026");
    expect(await verifyPassword("S3cure!password-2026", stored)).toBe(true);
  });

  it("verifyPassword rejects a near-miss password (off-by-one)", async () => {
    const stored = await hashPassword("S3cure!password-2026");
    expect(await verifyPassword("S3cure!password-2025", stored)).toBe(false);
  });

  it("verifyPassword rejects an empty candidate", async () => {
    const stored = await hashPassword("S3cure!password-2026");
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("verifyPassword rejects malformed stored strings", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "no-colon-here")).toBe(false);
    expect(await verifyPassword("anything", "abc:nothex!!")).toBe(false);
    expect(await verifyPassword("anything", "abc:0000")).toBe(false); // wrong length
  });

  it("verifyPassword is consistent across many invocations", async () => {
    const stored = await hashPassword("consistencyCheck1");
    for (let i = 0; i < 5; i++) {
      expect(await verifyPassword("consistencyCheck1", stored)).toBe(true);
    }
  });
});
