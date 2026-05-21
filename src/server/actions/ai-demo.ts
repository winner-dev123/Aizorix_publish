"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { orchestrate } from "@/server/ai/orchestrate";
import type { OrchestratorEnvelope } from "@/server/ai/types";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * Stable per-user externalChatId for the `/app/ai` demo. Using one ID per
 * user means a refresh keeps the AI's memory of the user's earlier turns,
 * matching the WhatsApp behavior. The `demo-` prefix lets the inbox
 * queries (which only return `channel: WHATSAPP`) skip these rows.
 */
function demoExternalChatId(userId: string): string {
  return `demo-${userId}`;
}

const turnSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export type DemoTurnResult = {
  respuesta: string;
  accion: OrchestratorEnvelope["accion"];
  requiresHuman: boolean;
};

/**
 * Run one orchestrator turn against the real AI from the dashboard demo.
 * Scoped to the caller's session (clinic + user). Persists messages on
 * a dedicated WEB-channel Conversation so they don't pollute the
 * WhatsApp inbox.
 */
export async function runDemoTurnAction(
  input: z.input<typeof turnSchema>,
): Promise<ActionResult<DemoTurnResult>> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  }

  const parsed = turnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Mensaje no válido",
      },
    };
  }

  try {
    const envelope = await orchestrate({
      clinicId: session.user.clinicId,
      channel: "WEB",
      externalChatId: demoExternalChatId(session.user.id),
      fromName: session.user.name ?? session.user.email ?? undefined,
      message: parsed.data.message,
    });

    return {
      ok: true,
      data: {
        respuesta: envelope.respuesta,
        accion: envelope.accion,
        requiresHuman: envelope.requiresHuman,
      },
    };
  } catch (e) {
    console.error("[runDemoTurnAction] orchestrate failed:", e);
    return {
      ok: false,
      error: {
        code: "ORCHESTRATE_FAILED",
        message: e instanceof Error ? e.message : "El bot no pudo responder",
      },
    };
  }
}

/**
 * Wipe the demo conversation for the current user so the next turn starts
 * fresh. Useful for the "Reiniciar" button in real mode — otherwise the
 * AI keeps the prior demo turns as context.
 */
export async function clearDemoConversationAction(): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  }

  const externalChatId = demoExternalChatId(session.user.id);
  const existing = await prisma.conversation.findFirst({
    where: { clinicId: session.user.clinicId, externalChatId, channel: "WEB" },
  });
  if (existing) {
    await prisma.message.deleteMany({ where: { conversationId: existing.id } });
    await prisma.humanHandoff.deleteMany({ where: { conversationId: existing.id } });
    await prisma.conversation.delete({ where: { id: existing.id } });
  }

  revalidatePath("/app/ai");
  return { ok: true, data: null };
}
