import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { orchestrate } from "@/server/ai/orchestrate";
import { checkRateLimit } from "@/server/rate-limit";
import { incr } from "@/server/metrics";
import {
  type InboundMessage,
  getWhatsAppProvider,
  parseTwilioInbound,
  verifyTwilioSignature,
} from "@/server/whatsapp";

// Per-sender rate cap. 10 messages with a 1-message/6-seconds refill is
// enough for normal back-and-forth but stops a runaway sender from
// burning OpenAI tokens. Tune via env if it ever bites real traffic.
const WEBHOOK_RATE_CAPACITY = Number(process.env.WHATSAPP_RATE_CAPACITY ?? 10);
const WEBHOOK_RATE_REFILL_PER_SEC = Number(process.env.WHATSAPP_RATE_REFILL_PER_SEC ?? 1 / 6);

/**
 * Inbound WhatsApp webhook (Twilio shape).
 *
 *  1. verify the X-Twilio-Signature against the auth token (skipped when
 *     TWILIO_AUTH_TOKEN is unset — stub/dev mode)
 *  2. parse the form payload into the neutral InboundMessage
 *  3. resolve which clinic owns the destination number
 *  4. call orchestrate() to run the AI loop and persist the transcript
 *  5. send the orchestrator's text reply back via the active provider
 *
 * Twilio also accepts TwiML responses in the HTTP body as an alternative
 * delivery channel; we explicitly use the REST send API for symmetry with
 * any future Meta/YCloud adapter.
 */
export async function POST(request: NextRequest) {
  let inbound: InboundMessage | null = null;
  let formParams: Record<string, string> = {};

  try {
    const raw = await request.text();
    formParams = Object.fromEntries(new URLSearchParams(raw));
  } catch {
    incr("aizorix_whatsapp_webhook_requests_total", { status: "400" });
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const fullUrl = `${request.nextUrl.origin}${request.nextUrl.pathname}`;
    const valid = verifyTwilioSignature({
      signature: request.headers.get("x-twilio-signature"),
      fullUrl,
      params: formParams,
      authToken,
    });
    if (!valid) {
      incr("aizorix_whatsapp_webhook_requests_total", { status: "403" });
      return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 403 });
    }
  }

  inbound = parseTwilioInbound(formParams);
  if (!inbound) {
    incr("aizorix_whatsapp_webhook_requests_total", { status: "400" });
    return NextResponse.json({ error: "UNPARSABLE_PAYLOAD" }, { status: 400 });
  }

  // Rate-limit by sender. Twilio retries on non-2xx, so a 429 here is OK —
  // they'll backoff and we'll be ready by the time they come back. Inbound
  // is keyed on the sender phone (not the clinic) so one chatty sender
  // can't starve other patients of the same clinic.
  if (!checkRateLimit(`wa:${inbound.fromAddress}`, WEBHOOK_RATE_CAPACITY, WEBHOOK_RATE_REFILL_PER_SEC)) {
    incr("aizorix_rate_limit_denials_total", { source: "whatsapp" });
    incr("aizorix_whatsapp_webhook_requests_total", { status: "429" });
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Demasiados mensajes en poco tiempo" },
      { status: 429 },
    );
  }

  const clinic = await prisma.clinic.findUnique({
    where: { whatsappNumber: inbound.toAddress },
  });
  if (!clinic) {
    console.warn(`[whatsapp] no clinic registered for ${inbound.toAddress}`);
    incr("aizorix_whatsapp_webhook_requests_total", { status: "404" });
    return NextResponse.json({ error: "CLINIC_NOT_REGISTERED" }, { status: 404 });
  }

  try {
    const envelope = await orchestrate({
      clinicId: clinic.id,
      channel: "WHATSAPP",
      externalChatId: inbound.fromAddress,
      fromName: inbound.fromName,
      message: inbound.text,
    });

    // Bot is paused for this conversation — record the inbound message
    // (already done by orchestrate) and stay silent. Staff will reply
    // manually through the dashboard composer.
    if (envelope.accion === "PAUSED" || !envelope.respuesta) {
      incr("aizorix_whatsapp_webhook_requests_total", { status: "200" });
      return NextResponse.json({
        conversationId: envelope.conversationId,
        delivery: { status: "SKIPPED" },
        requiresHuman: envelope.requiresHuman,
        accion: envelope.accion,
      });
    }

    const provider = getWhatsAppProvider();
    const result = await provider.send({
      fromAddress: clinic.whatsappNumber ?? inbound.toAddress,
      toAddress: inbound.fromAddress,
      text: envelope.respuesta,
    });

    incr("aizorix_whatsapp_webhook_requests_total", { status: "200" });
    return NextResponse.json({
      conversationId: envelope.conversationId,
      delivery: result,
      requiresHuman: envelope.requiresHuman,
      accion: envelope.accion,
    });
  } catch (e) {
    console.error("[/api/webhooks/whatsapp]", e);
    incr("aizorix_whatsapp_webhook_requests_total", { status: "500" });
    return NextResponse.json(
      { error: "INTERNAL", message: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
