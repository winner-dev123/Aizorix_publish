import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { orchestrate } from "@/server/ai/orchestrate";
import { checkRateLimit } from "@/server/rate-limit";
import { incr } from "@/server/metrics";

/**
 * Public landing-page chat endpoint. Used by `<AiChatBubble />` on the
 * marketing site so unauthenticated visitors can chat with the real AI
 * orchestrator (same one used by /app/ai and /api/webhooks/whatsapp).
 *
 * Contract:
 *   POST application/json
 *     { message: string, sessionId: string }
 *   →
 *     { respuesta, accion, requiresHuman, conversationId }
 *
 * Design notes:
 *   - `sessionId` is generated client-side in sessionStorage. Used as the
 *     conversation key so the orchestrator can preserve history across
 *     the visitor's turns. NOT a real phone number — we use the
 *     "landing:<sessionId>" namespace to keep these conversations off
 *     the WhatsApp inbox views.
 *   - channel = WEB so dashboard inbox queries (channel=WHATSAPP) skip
 *     these rows. Same pattern as runDemoTurnAction in /app/ai.
 *   - Clinic resolution: ?clinicSlug query → DEMO_CLINIC_SLUG env →
 *     first clinic with whatsappNumber → any clinic. Same fallback as
 *     /api/webhooks/inbound.
 *   - Rate limit: per-sessionId token bucket. Default cap 12, refill
 *     1/8s — generous enough for normal chat, tight enough to stop a
 *     scripted abuser from burning OpenAI tokens.
 *
 * Disable in production by setting LANDING_CHAT_ENABLED=0.
 */

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  sessionId: z.string().trim().min(8).max(64),
});

const RATE_CAPACITY = Number(process.env.LANDING_CHAT_RATE_CAPACITY ?? 12);
const RATE_REFILL_PER_SEC = Number(process.env.LANDING_CHAT_RATE_REFILL_PER_SEC ?? 1 / 8);

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS)) {
    response.headers.set(k, v);
  }
  return response;
}

async function resolveDemoClinic(slugFromQuery: string | null) {
  const slug = slugFromQuery || process.env.DEMO_CLINIC_SLUG || null;
  if (slug) {
    const c = await prisma.clinic.findUnique({ where: { slug } });
    if (c) return c;
  }
  const withNumber = await prisma.clinic.findFirst({
    where: { whatsappNumber: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (withNumber) return withNumber;
  return prisma.clinic.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  if (process.env.LANDING_CHAT_ENABLED === "0") {
    return withCors(
      NextResponse.json(
        { error: "DISABLED", message: "El chat público está desactivado." },
        { status: 503 },
      ),
    );
  }

  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    incr("aizorix_landing_chat_requests_total", { status: "400" });
    return withCors(
      NextResponse.json({ error: "INVALID_BODY" }, { status: 400 }),
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    incr("aizorix_landing_chat_requests_total", { status: "400" });
    return withCors(
      NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      ),
    );
  }

  if (!checkRateLimit(`landing:${parsed.data.sessionId}`, RATE_CAPACITY, RATE_REFILL_PER_SEC)) {
    incr("aizorix_rate_limit_denials_total", { source: "landing" });
    incr("aizorix_landing_chat_requests_total", { status: "429" });
    return withCors(
      NextResponse.json(
        { error: "RATE_LIMITED", message: "Demasiados mensajes en poco tiempo. Inténtalo de nuevo en unos segundos." },
        { status: 429 },
      ),
    );
  }

  const url = new URL(request.url);
  const slugFromQuery = url.searchParams.get("clinicSlug") || url.searchParams.get("clinic");
  const clinic = await resolveDemoClinic(slugFromQuery);
  if (!clinic) {
    incr("aizorix_landing_chat_requests_total", { status: "404" });
    return withCors(
      NextResponse.json(
        {
          error: "CLINIC_NOT_FOUND",
          message: "No hay clínica de demo configurada. Define DEMO_CLINIC_SLUG.",
        },
        { status: 404 },
      ),
    );
  }

  try {
    const envelope = await orchestrate({
      clinicId: clinic.id,
      channel: "WEB",
      externalChatId: `landing:${parsed.data.sessionId}`,
      fromName: "Visitante web",
      message: parsed.data.message,
    });

    incr("aizorix_landing_chat_requests_total", { status: "200" });

    return withCors(
      NextResponse.json({
        respuesta: envelope.respuesta,
        accion: envelope.accion,
        requiresHuman: envelope.requiresHuman,
        conversationId: envelope.conversationId,
      }),
    );
  } catch (e) {
    console.error("[/api/chat/landing]", e);
    incr("aizorix_landing_chat_requests_total", { status: "500" });
    return withCors(
      NextResponse.json(
        {
          error: "INTERNAL",
          message: "La IA no pudo responder. Inténtalo en un momento.",
        },
        { status: 500 },
      ),
    );
  }
}
