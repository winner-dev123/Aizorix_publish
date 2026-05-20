import type { OutboundMessage, OutboundResult, WhatsAppProvider } from "./client";

/**
 * In-process stub provider. Records every outbound message in an array so
 * tests and dev sessions can inspect what the bot would have sent. The
 * webhook route falls back to this when no real provider is configured.
 *
 * Not safe for production: messages aren't actually delivered to WhatsApp.
 */
export class StubWhatsAppProvider implements WhatsAppProvider {
  readonly id = "stub" as const;
  private readonly sent: OutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<OutboundResult> {
    this.sent.push(message);
    if (process.env.WHATSAPP_STUB_LOG !== "0") {
      console.log(
        `[whatsapp:stub] ${message.fromAddress} → ${message.toAddress}: ${message.text}`,
      );
    }
    return {
      providerMessageId: `stub-${Date.now()}-${this.sent.length}`,
      status: "SENT",
    };
  }

  /** Test-only accessor — returns a copy of every message sent so far. */
  history(): OutboundMessage[] {
    return [...this.sent];
  }

  /** Test-only — clears the history. */
  clear(): void {
    this.sent.length = 0;
  }
}

let cachedStub: StubWhatsAppProvider | null = null;

export function getStubProvider(): StubWhatsAppProvider {
  cachedStub ??= new StubWhatsAppProvider();
  return cachedStub;
}
