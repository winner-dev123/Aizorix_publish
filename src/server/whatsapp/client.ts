/**
 * Provider-neutral WhatsApp client used by the webhook handler.
 *
 * Inbound messages are normalized by each provider's webhook adapter into
 * the shared InboundMessage shape. Outbound messages are delivered through
 * the `send` method. Tests use the StubProvider so the full inbound →
 * orchestrate → outbound loop can run without external calls.
 */

export type InboundMessage = {
  /** The clinic's WhatsApp number that received the message (E.164). */
  toAddress: string;
  /** The patient's WhatsApp number that sent it (E.164). */
  fromAddress: string;
  /** Optional display name reported by WhatsApp (may be patient nickname). */
  fromName?: string;
  /** Plain-text body of the message. */
  text: string;
  /** Provider-specific message id, useful for dedup / replay. */
  providerMessageId?: string;
  /** Raw payload kept for audit. Stored on the inbound Message row. */
  raw: unknown;
};

export type OutboundMessage = {
  /** The clinic's WhatsApp number sending the reply (E.164). */
  fromAddress: string;
  /** The patient's WhatsApp number (E.164). */
  toAddress: string;
  text: string;
};

export type OutboundResult = {
  providerMessageId?: string;
  status: "SENT" | "QUEUED" | "FAILED";
  error?: string;
};

export interface WhatsAppProvider {
  /** Provider identifier used in logs and metadata. */
  readonly id: "stub" | "twilio";
  /** Send an outbound text message. */
  send(message: OutboundMessage): Promise<OutboundResult>;
}
