/**
 * Tests the /api/metrics endpoint:
 *  - returns Prometheus text exposition format
 *  - respects METRICS_AUTH_TOKEN gating (404 on wrong/missing bearer)
 *
 * Calls the GET handler directly with constructed NextRequests — no
 * dev-server needed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "../route";
import { incr, resetMetricsForTests, registerCounter } from "../../../../server/metrics";

function reqWith(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get(key: string) {
        return headers[key.toLowerCase()] ?? null;
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("/api/metrics", () => {
  beforeEach(() => {
    resetMetricsForTests();
    registerCounter("aizorix_test_metric", "test");
    incr("aizorix_test_metric", { kind: "demo" });
  });

  afterEach(() => {
    resetMetricsForTests();
    vi.unstubAllEnvs();
  });

  it("returns 200 + Prometheus text when METRICS_AUTH_TOKEN is unset", async () => {
    vi.stubEnv("METRICS_AUTH_TOKEN", "");
    const res = await GET(reqWith());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("# TYPE aizorix_test_metric counter");
    expect(body).toContain('aizorix_test_metric{kind="demo"} 1');
  });

  it("returns 404 when METRICS_AUTH_TOKEN is set but no bearer presented", async () => {
    vi.stubEnv("METRICS_AUTH_TOKEN", "secret-token");
    const res = await GET(reqWith());
    expect(res.status).toBe(404);
  });

  it("returns 404 when the bearer token is wrong", async () => {
    vi.stubEnv("METRICS_AUTH_TOKEN", "secret-token");
    const res = await GET(reqWith({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 when the bearer token matches", async () => {
    vi.stubEnv("METRICS_AUTH_TOKEN", "secret-token");
    const res = await GET(reqWith({ authorization: "Bearer secret-token" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("aizorix_test_metric");
  });
});
