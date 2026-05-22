/**
 * Integration tests for the public landing-page chat endpoint that powers
 * the <AiChatBubble /> on the marketing site.
 *
 * Covers:
 *   - validation (missing/short body, malformed JSON)
 *   - rate-limit wiring (per-sessionId bucket + per-session isolation)
 *   - CORS preflight (OPTIONS 204)
 *   - LANDING_CHAT_ENABLED=0 disables the route (503)
 *   - happy path returns the orchestrator envelope flattened to
 *     { respuesta, accion, requiresHuman, conversationId }
 *
 * The orchestrator is mocked because we only care about the HTTP-layer
 * contract here — the orchestrator has its own dedicated tests.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/ai/orchestrate", () => ({
  orchestrate: vi.fn(),
}));

import { OPTIONS, POST } from "../route";
import { orchestrate } from "@/server/ai/orchestrate";
import { prisma } from "@/server/db";
import { resetRateLimitForTests } from "../../../../../server/rate-limit";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

function buildRequest(
  body: unknown,
  init: { url?: string; headers?: Record<string, string> } = {},
): Request {
  return new Request(init.url ?? "http://localhost:3000/api/chat/landing", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describeMaybe("/api/chat/landing", () => {
  let clinicSlug: string;

  beforeAll(async () => {
    const c = await prisma.clinic.findFirstOrThrow({ where: { slug: "bellem" } });
    clinicSlug = c.slug;
  });

  beforeEach(() => {
    resetRateLimitForTests();
    vi.mocked(orchestrate).mockReset();
    vi.mocked(orchestrate).mockResolvedValue({
      respuesta: "Hola, ¿en qué te ayudo?",
      accion: "INFO",
      requiresHuman: false,
      metadata: {},
      conversationId: "conv-landing-test",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitForTests();
  });

  it("answers OPTIONS preflight with 204 and CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("returns 400 on malformed JSON body", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/chat/landing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when sessionId is too short", async () => {
    const res = await POST(
      buildRequest({
        message: "hola",
        sessionId: "short",
      }) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(vi.mocked(orchestrate)).not.toHaveBeenCalled();
  });

  it("returns 400 when message is empty", async () => {
    const res = await POST(
      buildRequest({
        message: "   ",
        sessionId: "abcdefgh123",
      }) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(orchestrate)).not.toHaveBeenCalled();
  });

  it("returns 503 when LANDING_CHAT_ENABLED is set to 0", async () => {
    vi.stubEnv("LANDING_CHAT_ENABLED", "0");
    const res = await POST(
      buildRequest({
        message: "hola",
        sessionId: "abcdefgh123",
      }) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(503);
    expect(vi.mocked(orchestrate)).not.toHaveBeenCalled();
  });

  it("happy path: flattens the orchestrator envelope to the demo-friendly shape", async () => {
    const res = await POST(
      buildRequest(
        { message: "¿qué hacéis?", sessionId: "session-aaaa-1111" },
        { url: `http://localhost:3000/api/chat/landing?clinicSlug=${clinicSlug}` },
      ) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.respuesta).toBe("Hola, ¿en qué te ayudo?");
    expect(body.accion).toBe("INFO");
    expect(body.requiresHuman).toBe(false);
    expect(body.conversationId).toBe("conv-landing-test");

    // Confirm the orchestrator was invoked with the WEB channel and a
    // namespaced externalChatId so these visitors don't pollute the
    // WhatsApp inbox views.
    expect(vi.mocked(orchestrate)).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "WEB",
        externalChatId: "landing:session-aaaa-1111",
        fromName: "Visitante web",
        message: "¿qué hacéis?",
      }),
    );
  });

  it("rate-limits the same session after the bucket is drained", async () => {
    const session = "session-rate-1234";
    // Default cap 12 — burn through it.
    for (let i = 0; i < 12; i++) {
      const ok = await POST(
        buildRequest(
          { message: `msg ${i}`, sessionId: session },
          { url: `http://localhost:3000/api/chat/landing?clinicSlug=${clinicSlug}` },
        ) as Request as unknown as Parameters<typeof POST>[0],
      );
      expect(ok.status).toBe(200);
    }
    const blocked = await POST(
      buildRequest(
        { message: "uno más", sessionId: session },
        { url: `http://localhost:3000/api/chat/landing?clinicSlug=${clinicSlug}` },
      ) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("isolates rate-limit buckets per session", async () => {
    // Drain one session
    for (let i = 0; i < 12; i++) {
      await POST(
        buildRequest(
          { message: `msg ${i}`, sessionId: "session-iso-aaaa" },
          { url: `http://localhost:3000/api/chat/landing?clinicSlug=${clinicSlug}` },
        ) as Request as unknown as Parameters<typeof POST>[0],
      );
    }
    // Different session — fresh bucket.
    const other = await POST(
      buildRequest(
        { message: "hola desde otra sesión", sessionId: "session-iso-bbbb" },
        { url: `http://localhost:3000/api/chat/landing?clinicSlug=${clinicSlug}` },
      ) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(other.status).toBe(200);
  });

  it("falls back to DEMO_CLINIC_SLUG env when no query param is present", async () => {
    vi.stubEnv("DEMO_CLINIC_SLUG", clinicSlug);
    const res = await POST(
      buildRequest({
        message: "hola",
        sessionId: "session-env-aaaa",
      }) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 with a friendly message when orchestrate throws", async () => {
    vi.mocked(orchestrate).mockRejectedValueOnce(new Error("LLM unavailable"));
    const res = await POST(
      buildRequest(
        { message: "hola", sessionId: "session-err-aaaa" },
        { url: `http://localhost:3000/api/chat/landing?clinicSlug=${clinicSlug}` },
      ) as Request as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("INTERNAL");
    expect(body.message).toMatch(/inténtalo/i);
  });
});
