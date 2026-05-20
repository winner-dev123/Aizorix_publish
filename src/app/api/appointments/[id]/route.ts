import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cancelAppointment, rescheduleAppointment } from "@/server/booking";
import { isDomainError } from "@/server/errors";

const patchSchema = z
  .object({
    clinicId: z.string().min(1),
    newStartsAt: z.string().datetime().optional(),
    newTechnicianId: z.string().optional(),
    bypassLeadTime: z.boolean().optional(),
  })
  .refine((d) => d.newStartsAt || d.newTechnicianId, {
    message: "Provide newStartsAt and/or newTechnicianId",
  });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await rescheduleAppointment({
      appointmentId: id,
      clinicId: parsed.data.clinicId,
      newStartsAt: parsed.data.newStartsAt
        ? new Date(parsed.data.newStartsAt)
        : new Date(), // require newStartsAt is enforced by refine
      newTechnicianId: parsed.data.newTechnicianId,
      bypassLeadTime: parsed.data.bypassLeadTime,
    });
    return NextResponse.json({ appointment: updated });
  } catch (e) {
    if (isDomainError(e)) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  clinicId: z.string().min(1),
  reason: z.string().optional(),
});

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is OK for DELETE
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const cancelled = await cancelAppointment({
      appointmentId: id,
      clinicId: parsed.data.clinicId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ appointment: cancelled });
  } catch (e) {
    if (isDomainError(e)) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
