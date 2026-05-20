import crypto from "node:crypto";
import type {
  InboundMessage,
  OutboundMessage,
  OutboundResult,
  WhatsAppProvider,
} from "./client";

/**
 * Twilio WhatsApp adapter.
 *
 * Inbound: Twilio POSTs form-encoded fields including From="whatsapp:+34…",
 * To="whatsapp:+34…", Body, ProfileName. We strip the "whatsapp:" prefix.
 *
 * Outbound: POST to /Accounts/{SID}/Messages.json with To/From/Body.
 * Auth is HTTP basic (SID / auth token).
 *
 * Signature verification: Twilio signs the full URL + the sorted form
 * params using HMAC-SHA1 with the auth token, base64-encoded, sent as the
 * `X-Twilio-Signature` header. We recompute the same string and compare
 * in constant time.
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly id = "twilio" as const;

  constructor(
    private readonly accountSid: string = required("TWILIO_ACCOUNT_SID"),
    private readonly authToken: string = required("TWILIO_AUTH_TOKEN"),
    private readonly defaultFrom: string | null = process.env.TWILIO_WHATSAPP_FROM ?? null,
  ) {}

  async send(message: OutboundMessage): Promise<OutboundResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const form = new URLSearchParams({
      To: withPrefix(message.toAddress),
      From: withPrefix(this.defaultFrom ?? message.fromAddress),
      Body: message.text,
    });

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "FAILED", error: `${res.status} ${text}`.slice(0, 500) };
    }
    const json = (await res.json().catch(() => ({}))) as { sid?: string; status?: string };
    return {
      providerMessageId: json.sid,
      status: json.status === "queued" ? "QUEUED" : "SENT",
    };
  }
}

/**
 * Verify Twilio's X-Twilio-Signature header. Returns true when the
 * signature matches what we would have produced with our auth token.
 */
export function verifyTwilioSignature(args: {
  signature: string | null;
  fullUrl: string;
  params: Record<string, string>;
  authToken: string;
}): boolean {
  if (!args.signature) return false;
  // Twilio's recipe: URL + concat(sortedKey + value) for every form param.
  const sortedKeys = Object.keys(args.params).sort();
  const data = args.fullUrl + sortedKeys.map((k) => k + args.params[k]).join("");
  const expected = crypto
    .createHmac("sha1", args.authToken)
    .update(data, "utf8")
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(args.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Decode a Twilio inbound form payload into the neutral InboundMessage.
 */
export function parseTwilioInbound(params: Record<string, string>): InboundMessage | null {
  const from = params.From;
  const to = params.To;
  const body = params.Body;
  if (!from || !to || typeof body !== "string") return null;
  return {
    toAddress: stripPrefix(to),
    fromAddress: stripPrefix(from),
    fromName: params.ProfileName || undefined,
    text: body,
    providerMessageId: params.MessageSid,
    raw: params,
  };
}

function stripPrefix(addr: string): string {
  return addr.startsWith("whatsapp:") ? addr.slice("whatsapp:".length) : addr;
}

function withPrefix(addr: string): string {
  return addr.startsWith("whatsapp:") ? addr : `whatsapp:${addr}`;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
