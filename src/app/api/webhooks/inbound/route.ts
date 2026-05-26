import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { orchestrate } from "@/server/ai/orchestrate";
import { checkRateLimit } from "@/server/rate-limit";
import { incr } from "@/server/metrics";

/**
 * Generic inbound endpoint for the "Full Stack" mode of the demo simulator
 * (demo.html) and for any n8n flow that forwards a normalized JSON payload
 * to our app. Distinct from /api/webhooks/whatsapp, which expects Twilio's
 * signed form-encoded shape.
 *
 * Contract:
 *   POST application/json
 *     { phone: string, message: string, customerName?: string }
 *   →
 *     { respuesta, message, output, accion, requiresHuman, route, conversationId, metadata }
 *
 *   The duplicate `message`/`output` fields exist so the demo's permissive
 *   extractor (which tries several keys) renders the bubble regardless of
 *   which field its UI picks first.
 *
 * Clinic resolution priority:
 *   1. ?clinicSlug= or ?clinic= query param
 *   2. X-Aizorix-Clinic-Slug header
 *   3. DEMO_CLINIC_SLUG env var
 *   4. The clinic with a configured whatsappNumber (most likely the demo
 *      tenant in single-clinic dev setups)
 *   5. The single clinic in the DB (last-resort fallback)
 *
 * Auth:
 *   If INBOUND_WEBHOOK_SECRET is set, callers must send
 *   `Authorization: Bearer <secret>`. Unset means "no gate" — fine for
 *   dev/staging behind an n8n forwarder that you control.
 *
 * Rate limit: per-phone token bucket, same defaults as /api/webhooks/whatsapp.
 *
 * CORS: open. n8n hits this server-to-server so CORS is moot for the
 * primary use case, but enabling it also lets developers call the endpoint
 * directly from demo.html during testing.
 */

const bodySchema = z.object({
  phone: z.string().trim().min(5).max(32),
  message: z.string().trim().min(1).max(2000),
  customerName: z.string().trim().max(120).optional(),
});

const RATE_CAPACITY = Number(process.env.INBOUND_RATE_CAPACITY ?? 10);
const RATE_REFILL_PER_SEC = Number(process.env.INBOUND_RATE_REFILL_PER_SEC ?? 1 / 6);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Aizorix-Clinic-Slug",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}

function normalizePhone(raw: string): string {
  const clean = raw.trim().replace(/[\s\-().]/g, "");
  if (!clean) return "";
  if (clean.startsWith("+")) return clean;
  if (/^\d{8,15}$/.test(clean)) return `+${clean}`;
  return clean;
}

async function resolveClinic(request: NextRequest) {
  const url = new URL(request.url);
  const fromQuery =
    url.searchParams.get("clinicSlug") || url.searchParams.get("clinic");
  const fromHeader = request.headers.get("x-aizorix-clinic-slug");
  const slug = fromQuery || fromHeader || process.env.DEMO_CLINIC_SLUG || null;

  if (slug) {
    const c = await prisma.clinic.findUnique({ where: { slug } });
    if (c) return c;
  }
  // Prefer a clinic that has a whatsappNumber set — most likely the demo
  // tenant. Falling back to the very first clinic keeps single-clinic dev
  // setups working without configuration.
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
  // Optional bearer-token gate
  const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET?.trim() || null;
  if (expectedSecret) {
    const header = request.headers.get("authorization") || "";
    const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (provided !== expectedSecret) {
      incr("aizorix_inbound_webhook_requests_total", { status: "401" });
      return withCors(
        NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
      );
    }
  }

  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    incr("aizorix_inbound_webhook_requests_total", { status: "400" });
    return withCors(
      NextResponse.json({ error: "INVALID_BODY" }, { status: 400 }),
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    incr("aizorix_inbound_webhook_requests_total", { status: "400" });
    return withCors(
      NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      ),
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    incr("aizorix_inbound_webhook_requests_total", { status: "400" });
    return withCors(
      NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Teléfono inválido" },
        { status: 400 },
      ),
    );
  }

  if (!checkRateLimit(`inbound:${phone}`, RATE_CAPACITY, RATE_REFILL_PER_SEC)) {
    incr("aizorix_rate_limit_denials_total", { source: "inbound" });
    incr("aizorix_inbound_webhook_requests_total", { status: "429" });
    return withCors(
      NextResponse.json(
        { error: "RATE_LIMITED", message: "Demasiados mensajes en poco tiempo" },
        { status: 429 },
      ),
    );
  }

  // Clinic resolution + orchestrate share ONE try/catch so a DB/LLM throw
  // always returns a JSON body — never a bare empty 500 that breaks the
  // caller's response.json() (which is what crashed demo.html).
  try {
    const clinic = await resolveClinic(request);
    if (!clinic) {
      incr("aizorix_inbound_webhook_requests_total", { status: "404" });
      return withCors(
        NextResponse.json(
          {
            error: "CLINIC_NOT_FOUND",
            message:
              "No hay clínica configurada. Ejecuta el seed, define DEMO_CLINIC_SLUG, pasa ?clinicSlug=… o el header X-Aizorix-Clinic-Slug.",
          },
          { status: 404 },
        ),
      );
    }

    const envelope = await orchestrate({
      clinicId: clinic.id,
      channel: "WHATSAPP",
      externalChatId: phone,
      fromName: parsed.data.customerName,
      message: parsed.data.message,
    });

    incr("aizorix_inbound_webhook_requests_total", { status: "200" });

    // Demo-friendly response shape. The simulator's extractor tries
    // message → respuesta → output → text in order; we populate the first
    // three so any of them yields the same string. `route` is "human" when
    // the conversation needs staff attention, otherwise "ai".
    return withCors(
      NextResponse.json({
        respuesta: envelope.respuesta,
        message: envelope.respuesta,
        output: envelope.respuesta,
        accion: envelope.accion,
        requiresHuman: envelope.requiresHuman,
        route: envelope.requiresHuman ? "human" : "ai",
        conversationId: envelope.conversationId,
        metadata: envelope.metadata,
        clinic: { id: clinic.id, slug: clinic.slug, name: clinic.name },
      }),
    );
  } catch (e) {
    console.error("[/api/webhooks/inbound]", e);
    incr("aizorix_inbound_webhook_requests_total", { status: "500" });
    return withCors(
      NextResponse.json(
        {
          error: "INTERNAL",
          message: "El asistente no pudo responder.",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 500 },
      ),
    );
  }
}
