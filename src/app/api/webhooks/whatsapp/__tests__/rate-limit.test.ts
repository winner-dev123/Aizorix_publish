/**
 * Verifies that the WhatsApp webhook actually wires the rate limiter into
 * the request pipeline (not just that the helper works in isolation, which
 * src/server/__tests__/rate-limit.test.ts already covers).
 *
 * We call the POST handler directly, send the same sender's payload past
 * the per-sender cap, and assert the 11th call returns 429 BEFORE any DB
 * lookup or orchestrate() invocation runs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import { resetRateLimitForTests } from "../../../../../server/rate-limit";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

// We route to an unregistered clinic number so each request short-circuits
// at the clinic-not-found check (after the rate limiter, before orchestrate).
// That keeps the test fast and lets us verify only the rate-limit wiring.
const UNREGISTERED_CLINIC_NUMBER = "+34900000099";

function inboundFormBody(from: string, body: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set("From", `whatsapp:${from}`);
  params.set("To", `whatsapp:${UNREGISTERED_CLINIC_NUMBER}`);
  params.set("Body", body);
  params.set("ProfileName", "Test Sender");
  params.set("MessageSid", `SM-${Date.now()}-${Math.random()}`);
  return params;
}

function buildRequest(form: URLSearchParams): Request {
  return new Request("http://localhost:3000/api/webhooks/whatsapp", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

describeMaybe("/api/webhooks/whatsapp rate limit", () => {
  beforeEach(() => {
    resetRateLimitForTests();
    // Make sure we're in stub mode (Twilio env unset) so the route doesn't
    // try to verify a real signature.
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    // Capacity stays at the route's default (10).
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitForTests();
  });

  it("returns 429 after the per-sender capacity is exhausted", async () => {
    const sender = "+34699999911";

    // Burn through the capacity. Every call should pass the rate-limit
    // check (which is what we're verifying) and then 404 because the To
    // number isn't registered to any clinic in the seeded DB.
    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await POST(buildRequest(inboundFormBody(sender, `hola ${i}`)) as any);
      expect(res.status).toBe(404);
    }

    // The 11th call within the same second should be rate-limited.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocked = await POST(buildRequest(inboundFormBody(sender, "una más")) as any);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("isolates buckets per sender — a different sender is unaffected", async () => {
    const noisy = "+34699999922";
    // Drain noisy's bucket — each call 404s (no clinic) after the limiter passes.
    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await POST(buildRequest(inboundFormBody(noisy, "fill")) as any);
      expect(res.status).toBe(404);
    }
    // Noisy is now blocked.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noisyBlocked = await POST(buildRequest(inboundFormBody(noisy, "extra")) as any);
    expect(noisyBlocked.status).toBe(429);

    // A fresh sender goes through the limiter (still 404 because there's
    // no clinic, but importantly not 429).
    const quiet = "+34699999933";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quietRes = await POST(buildRequest(inboundFormBody(quiet, "hola")) as any);
    expect(quietRes.status).toBe(404);
  });
});
