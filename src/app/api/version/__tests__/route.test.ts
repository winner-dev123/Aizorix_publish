/**
 * Tests for the /api/version endpoint. Pure logic — no DB.
 *
 * Verifies the env-var precedence order (BUILD_VERSION → VERCEL_GIT_COMMIT_SHA
 * → npm_package_version → "dev") and the response shape that monitoring
 * tools rely on.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

describe("/api/version", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 200 with the expected shape", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
    expect(typeof body.nodeVersion).toBe("string");
    expect(body.nodeVersion).toMatch(/^v\d/);
    expect(typeof body.env).toBe("string");
    expect(typeof body.timestamp).toBe("string");
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it("prefers BUILD_VERSION over every other source", async () => {
    vi.stubEnv("BUILD_VERSION", "1.2.3");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcdef1");
    vi.stubEnv("npm_package_version", "0.1.0");
    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe("1.2.3");
  });

  it("falls back to VERCEL_GIT_COMMIT_SHA when BUILD_VERSION is unset", async () => {
    vi.stubEnv("BUILD_VERSION", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcdef1");
    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe("abcdef1");
    expect(body.gitSha).toBe("abcdef1");
  });

  it("emits 'dev' when no version env is set", async () => {
    vi.stubEnv("BUILD_VERSION", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("npm_package_version", "");
    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe("dev");
    expect(body.gitSha).toBeNull();
  });

  it("sends a cache-control header so uptime checks don't hammer the function", async () => {
    const res = await GET();
    expect(res.headers.get("cache-control")).toContain("max-age=30");
  });
});
