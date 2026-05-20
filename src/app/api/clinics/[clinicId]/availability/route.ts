import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAvailability } from "@/server/availability";
import { isDomainError } from "@/server/errors";

const querySchema = z.object({
  treatmentId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
  technicianId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clinicId: string }> },
) {
  const { clinicId } = await context.params;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    treatmentId: url.searchParams.get("treatmentId"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    technicianId: url.searchParams.get("technicianId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const slots = await findAvailability({
      clinicId,
      treatmentId: parsed.data.treatmentId,
      fromDate: new Date(parsed.data.from),
      toDate: new Date(parsed.data.to),
      technicianId: parsed.data.technicianId,
    });
    return NextResponse.json({ slots });
  } catch (e) {
    if (isDomainError(e)) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
