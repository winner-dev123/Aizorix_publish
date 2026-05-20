import type { WhatsAppProvider } from "./client";
import { getStubProvider } from "./stub";
import { TwilioWhatsAppProvider } from "./twilio";

export type { InboundMessage, OutboundMessage, OutboundResult, WhatsAppProvider } from "./client";
export { StubWhatsAppProvider, getStubProvider } from "./stub";
export {
  TwilioWhatsAppProvider,
  parseTwilioInbound,
  verifyTwilioSignature,
} from "./twilio";

/**
 * Resolve which provider to use based on env. Defaults to the stub so
 * development without Twilio credentials still exercises the full loop.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return new TwilioWhatsAppProvider();
  }
  return getStubProvider();
}
