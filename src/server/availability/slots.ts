import { addMinutes } from "date-fns";
import type {
  BlockedRange,
  ExistingAppointment,
  Slot,
  SlotGenerationInput,
} from "./types";

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

function hasAppointmentConflict(
  start: Date,
  end: Date,
  technicianId: string,
  appointments: ExistingAppointment[],
): boolean {
  for (const a of appointments) {
    if (a.technicianId !== technicianId) continue;
    if (rangesOverlap(start, end, a.startsAt, a.endsAt)) return true;
  }
  return false;
}

function hasBlockConflict(
  start: Date,
  end: Date,
  technicianId: string,
  blocked: BlockedRange[],
): boolean {
  for (const b of blocked) {
    if (b.technicianId !== null && b.technicianId !== technicianId) continue;
    if (rangesOverlap(start, end, b.startsAt, b.endsAt)) return true;
  }
  return false;
}

/**
 * Pure slot generator. Given fully-resolved business-hour windows (in UTC),
 * treatment duration, eligible technicians and known conflicts, returns every
 * bookable slot. No DB access — directly unit-testable.
 *
 * A slot is bookable iff:
 *  - it fits entirely inside one business-hours window (no spanning a break),
 *  - its start is at least `minLeadMinutes` after `now`,
 *  - the given technician has no overlapping appointment,
 *  - no clinic-wide or technician-specific blocked range overlaps it.
 */
export function generateSlots(input: SlotGenerationInput): Slot[] {
  const {
    windows,
    treatmentDurationMinutes,
    bufferMinutes = 0,
    granularityMinutes = 30,
    technicianIds,
    existingAppointments,
    blocked,
    now,
    minLeadMinutes = 120,
  } = input;

  if (technicianIds.length === 0) return [];
  if (treatmentDurationMinutes <= 0) return [];

  const earliestStart = addMinutes(now, minLeadMinutes).getTime();
  const totalDuration = treatmentDurationMinutes + bufferMinutes;
  const slots: Slot[] = [];

  for (const window of windows) {
    const windowEndMs = window.closesAt.getTime();
    let cursor = new Date(window.opensAt);

    while (true) {
      const cursorMs = cursor.getTime();
      const slotEnd = addMinutes(cursor, totalDuration);
      if (slotEnd.getTime() > windowEndMs) break;

      if (cursorMs >= earliestStart) {
        for (const techId of technicianIds) {
          if (hasAppointmentConflict(cursor, slotEnd, techId, existingAppointments)) {
            continue;
          }
          if (hasBlockConflict(cursor, slotEnd, techId, blocked)) {
            continue;
          }
          slots.push({
            startsAt: new Date(cursor),
            endsAt: new Date(slotEnd),
            technicianId: techId,
          });
        }
      }

      cursor = addMinutes(cursor, granularityMinutes);
    }
  }

  return slots;
}
