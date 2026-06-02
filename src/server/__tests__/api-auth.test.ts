/**
 * Unit tests for src/server/api-auth.ts — the building blocks below
 * verifyApiRequest (which needs DB). These run without a database.
 */
import { describe, expect, it } from "vitest";
import {
  generateRawToken,
  hashToken,
  tokenPrefix,
} from "../api-auth";

describe("api-auth: token helpers (pure)", () => {
  it("generateRawToken produces the expected prefix + length", () => {
    const t = generateRawToken();
    expect(t.startsWith("azx_live_")).toBe(true);
    // "azx_live_" (9) + 32 random bytes base64url-encoded (~43 chars) = 52.
    expect(t.length).toBeGreaterThanOrEqual(50);
    expect(t.length).toBeLessThanOrEqual(54);
  });

  it("generateRawToken returns different values on every call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateRawToken()));
    expect(tokens.size).toBe(100);
  });

  it("hashToken is deterministic + produces hex-64", () => {
    const a = hashToken("azx_live_test");
    const b = hashToken("azx_live_test");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashToken changes when input changes by one char", () => {
    expect(hashToken("azx_live_a")).not.toBe(hashToken("azx_live_b"));
  });

  it("tokenPrefix returns exactly 12 chars", () => {
    const t = generateRawToken();
    const p = tokenPrefix(t);
    expect(p.length).toBe(12);
    expect(t.startsWith(p)).toBe(true);
  });
});
