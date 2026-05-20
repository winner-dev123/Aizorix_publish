import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { bookAppointment } from "@/server/booking";
import { isDomainError } from "@/server/errors";

const listSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  technicianId: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clinicId: string }> },
) {
  const { clinicId } = await context.params;
  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    technicianId: url.searchParams.get("technicianId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      technicianId: parsed.data.technicianId,
      startsAt: parsed.data.from ? { gte: new Date(parsed.data.from) } : undefined,
      endsAt: parsed.data.to ? { lte: new Date(parsed.data.to) } : undefined,
    },
    include: {
      patient: { select: { firstName: true, lastName: true, phone: true } },
      technician: { select: { name: true, color: true } },
      treatment: { select: { name: true, durationMinutes: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 500,
  });

  return NextResponse.json({ appointments });
}

const bookSchema = z.object({
  patientId: z.string().min(1),
  treatmentId: z.string().min(1),
  technicianId: z.string().min(1),
  startsAt: z.string().datetime(),
  notes: z.string().optional(),
  bypassLeadTime: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clinicId: string }> },
) {
  const { clinicId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const appt = await bookAppointment({
      clinicId,
      patientId: parsed.data.patientId,
      treatmentId: parsed.data.treatmentId,
      technicianId: parsed.data.technicianId,
      startsAt: new Date(parsed.data.startsAt),
      notes: parsed.data.notes,
      bypassLeadTime: parsed.data.bypassLeadTime,
      createdBy: "STAFF",
    });
    return NextResponse.json({ appointment: appt }, { status: 201 });
  } catch (e) {
    if (isDomainError(e)) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
