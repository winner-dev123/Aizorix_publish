import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { orchestrate } from "@/server/ai/orchestrate";
import {
  type InboundMessage,
  getWhatsAppProvider,
  parseTwilioInbound,
  verifyTwilioSignature,
} from "@/server/whatsapp";

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
      return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 403 });
    }
  }

  inbound = parseTwilioInbound(formParams);
  if (!inbound) {
    return NextResponse.json({ error: "UNPARSABLE_PAYLOAD" }, { status: 400 });
  }

  const clinic = await prisma.clinic.findUnique({
    where: { whatsappNumber: inbound.toAddress },
  });
  if (!clinic) {
    console.warn(`[whatsapp] no clinic registered for ${inbound.toAddress}`);
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

    const provider = getWhatsAppProvider();
    const result = await provider.send({
      fromAddress: clinic.whatsappNumber ?? inbound.toAddress,
      toAddress: inbound.fromAddress,
      text: envelope.respuesta,
    });

    return NextResponse.json({
      conversationId: envelope.conversationId,
      delivery: result,
      requiresHuman: envelope.requiresHuman,
      accion: envelope.accion,
    });
  } catch (e) {
    console.error("[/api/webhooks/whatsapp]", e);
    return NextResponse.json(
      { error: "INTERNAL", message: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
