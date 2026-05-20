import { prisma } from "../db";
import { DomainError } from "../errors";
import { resolveWindowsForRange } from "./business-hours";
import { generateSlots } from "./slots";
import type { Slot } from "./types";

export type FindAvailabilityArgs = {
  clinicId: string;
  treatmentId: string;
  fromDate: Date;
  toDate: Date;
  technicianId?: string;
  now?: Date;
};

/**
 * Loads everything needed from the DB and delegates to the pure slot
 * generator. Returns an empty array when there's nothing bookable.
 */
export async function findAvailability(args: FindAvailabilityArgs): Promise<Slot[]> {
  const { clinicId, treatmentId, fromDate, toDate, technicianId, now = new Date() } = args;

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) throw new DomainError("CLINIC_NOT_FOUND", `Clinic ${clinicId} not found`);

  const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
  if (!treatment || treatment.clinicId !== clinicId) {
    throw new DomainError("TREATMENT_NOT_IN_CLINIC", "Treatment not found in clinic");
  }

  let eligibleTT = await prisma.technicianTreatment.findMany({
    where: {
      treatmentId,
      isExcluded: false,
      technician: { active: true, clinicId },
    },
    include: { technician: true },
  });

  const exclusive = eligibleTT.find((tt) => tt.isExclusive);
  if (exclusive) eligibleTT = [exclusive];

  if (technicianId) {
    eligibleTT = eligibleTT.filter((tt) => tt.technicianId === technicianId);
  }

  // Prefer non-fallback techs when any are available
  const preferred = eligibleTT.filter((tt) => !tt.isFallbackOnly);
  if (preferred.length > 0) eligibleTT = preferred;

  const technicianIds = eligibleTT.map((tt) => tt.technicianId);
  if (technicianIds.length === 0) return [];

  const hours = await prisma.clinicBusinessHours.findMany({
    where: { clinicId },
  });

  const windows = resolveWindowsForRange({
    from: fromDate,
    to: toDate,
    timezone: clinic.timezone,
    rows: hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      opensAt: h.opensAt,
      closesAt: h.closesAt,
    })),
  });

  const existing = await prisma.appointment.findMany({
    where: {
      clinicId,
      technicianId: { in: technicianIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: toDate },
      endsAt: { gt: fromDate },
    },
    select: { startsAt: true, endsAt: true, technicianId: true },
  });

  const blocked = await prisma.blockedSlot.findMany({
    where: {
      clinicId,
      OR: [{ technicianId: null }, { technicianId: { in: technicianIds } }],
      startsAt: { lt: toDate },
      endsAt: { gt: fromDate },
    },
    select: { startsAt: true, endsAt: true, technicianId: true },
  });

  return generateSlots({
    windows,
    treatmentDurationMinutes: treatment.durationMinutes,
    bufferMinutes: treatment.bufferMinutes,
    granularityMinutes: clinic.slotGranularityMin,
    minLeadMinutes: clinic.minLeadMinutes,
    technicianIds,
    existingAppointments: existing,
    blocked,
    now,
  });
}

export { resolveWindowsForRange, isWithinBusinessHours } from "./business-hours";
export { generateSlots, rangesOverlap } from "./slots";
export type * from "./types";
