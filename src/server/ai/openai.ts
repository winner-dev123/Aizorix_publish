import OpenAI from "openai";
import type {
  LLMChatArgs,
  LLMClient,
  LLMMessage,
  LLMResponse,
  LLMToolCall,
} from "./client";

let cachedSdk: OpenAI | null = null;

function getSdk(): OpenAI {
  if (cachedSdk) return cachedSdk;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  cachedSdk = new OpenAI({ apiKey });
  return cachedSdk;
}

function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

/**
 * OpenAI Chat Completions adapter. Translates the provider-neutral
 * LLMMessage shape into OpenAI's role-tagged message array and maps
 * `tool_calls` / `tool` messages back into the abstraction.
 */
class OpenAIClient implements LLMClient {
  constructor(private sdk: OpenAI = getSdk(), private model: string = getModel()) {}

  async chat(args: LLMChatArgs): Promise<LLMResponse> {
    const messages = [
      { role: "system" as const, content: args.system },
      ...args.messages.map(toOpenAIMessage),
    ];

    const completion = await this.sdk.chat.completions.create({
      model: this.model,
      max_tokens: args.maxTokens ?? 1024,
      messages,
      tools: args.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
    });

    const choice = completion.choices[0];
    if (!choice) {
      return { text: "", toolCalls: [], stopReason: "other" };
    }

    const toolCalls: LLMToolCall[] = (choice.message.tool_calls ?? []).flatMap((tc) => {
      if (tc.type !== "function") return [];
      let parsed: unknown = {};
      try {
        parsed = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        parsed = { __unparsable_arguments: tc.function.arguments };
      }
      return [{ id: tc.id, name: tc.function.name, input: parsed }];
    });

    return {
      text: choice.message.content ?? "",
      toolCalls,
      stopReason: mapStopReason(choice.finish_reason),
    };
  }
}

function toOpenAIMessage(m: LLMMessage): OpenAI.Chat.ChatCompletionMessageParam {
  if (m.role === "user") return { role: "user", content: m.content };
  if (m.role === "assistant") {
    const out: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
      role: "assistant",
      content: m.content || null,
    };
    if (m.toolCalls?.length) {
      out.tool_calls = m.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.input ?? {}) },
      }));
    }
    return out;
  }
  // role === "tool"
  return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
}

function mapStopReason(
  reason: OpenAI.Chat.Completions.ChatCompletion.Choice["finish_reason"],
): LLMResponse["stopReason"] {
  switch (reason) {
    case "tool_calls":
      return "tool_calls";
    case "stop":
      return "stop";
    case "length":
      return "length";
    default:
      return "other";
  }
}

export function getLLMClient(): LLMClient {
  return new OpenAIClient();
}
