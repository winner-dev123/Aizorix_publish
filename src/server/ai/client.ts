/**
 * Provider-neutral LLM client used by the orchestrator.
 *
 * The orchestrator calls one method (`chat`) and consumes a uniform
 * response shape regardless of which vendor SDK lives underneath.
 * That lets us swap providers (currently OpenAI) without touching the
 * tool dispatcher or the persistence layer, and lets tests script
 * deterministic conversations by passing an inline mock client.
 */

export type LLMRole = "user" | "assistant" | "tool";

export type LLMToolCall = {
  /** Provider-issued call id; must be echoed back with the tool result. */
  id: string;
  name: string;
  /** Already-parsed JSON (object), not the raw string. */
  input: unknown;
};

export type LLMMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: LLMToolCall[] }
  | { role: "tool"; toolCallId: string; content: string; isError?: boolean };

export type LLMToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema object describing the tool's arguments. */
  inputSchema: Record<string, unknown>;
};

export type LLMResponse = {
  text: string;
  toolCalls: LLMToolCall[];
  /** "tool_calls" when the model wants to invoke tools, "stop" when it's done. */
  stopReason: "tool_calls" | "stop" | "length" | "other";
};

export type LLMChatArgs = {
  system: string;
  messages: LLMMessage[];
  tools: LLMToolDefinition[];
  maxTokens?: number;
};

export interface LLMClient {
  chat(args: LLMChatArgs): Promise<LLMResponse>;
}
