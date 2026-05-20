import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/server/ai/orchestrate";

const bodySchema = z.object({
  clinicId: z.string().min(1),
  channel: z.enum(["WHATSAPP", "WEB", "SMS", "PHONE"]).optional(),
  externalChatId: z.string().min(1),
  fromName: z.string().optional(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
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
