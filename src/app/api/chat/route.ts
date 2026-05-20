import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { orchestrate } from "@/server/ai/orchestrate";

const bodySchema = z.object({
  clinicId: z.string().min(1),
  channel: z.enum(["WHATSAPP", "WEB", "SMS", "PHONE"]).optional(),
  externalChatId: z.string().min(1),
  fromName: z.string().optional(),
  message: z.string().min(1).max(2000),
});

/**
 * Orchestrator playground. Intentionally open in dev so curl tests don't
 * need a session cookie; in production it requires a NextAuth session and
 * enforces clinicId === session.user.clinicId so a logged-in user can't
 * drive the bot for a different tenant.
 */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production") {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (parsed.data.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  try {
    const envelope = await orchestrate(parsed.data);
    return NextResponse.json(envelope);
  } catch (e) {
    console.error("[/api/chat]", e);
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "INTERNAL", message }, { status: 500 });
  }
}
