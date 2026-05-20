import { prisma } from "../db";

export type EligibleTechRule = {
  technicianId: string;
  isPrimary: boolean;
  isPreferred: boolean;
  isExclusive: boolean;
  isExcluded: boolean;
  isFallbackOnly: boolean;
  technician: {
    id: string;
    name: string;
    active: boolean;
    prioritySensitive: boolean;
  };
};

export type AssignArgs = {
  clinicId: string;
  treatmentId: string;
  startsAt: Date;
  endsAt: Date;
  requestedTechnicianName?: string;
  now?: Date;
};

export type AssignResult = {
  technicianId: string;
  reason: "REQUESTED" | "EXCLUSIVE" | "PRIMARY" | "PREFERRED" | "FALLBACK" | "ONLY_OPTION";
} | null;

/**
 * Pure ranker. Given the candidate rule set and a list of busy technician ids,
 * returns the chosen tech (and the reason) or null when nothing fits.
 *
 * Rules (in order):
 *  1. Excluded → skip.
 *  2. Exclusive rule exists → only that tech is eligible.
 *  3. Honor requestedTechnicianName when that tech is eligible and free.
 *  4. Prefer non-fallback techs when any exist.
 *  5. Sort: isPreferred desc, isPrimary desc, prioritySensitive asc, name asc.
 */
export function pickTechnician(
  rules: EligibleTechRule[],
  busyTechnicianIds: Set<string>,
  requestedTechnicianName?: string,
): AssignResult {
  const usable = rules.filter((r) => !r.isExcluded && r.technician.active);
  if (usable.length === 0) return null;

  const exclusive = usable.find((r) => r.isExclusive);
  const candidates = exclusive ? [exclusive] : usable;

  if (requestedTechnicianName) {
    const requested = candidates.find((r) =>
      r.technician.name.toLowerCase().includes(requestedTechnicianName.toLowerCase()),
    );
    if (requested && !busyTechnicianIds.has(requested.technicianId)) {
      return { technicianId: requested.technicianId, reason: "REQUESTED" };
    }
  }

  if (exclusive) {
    if (busyTechnicianIds.has(exclusive.technicianId)) return null;
    return { technicianId: exclusive.technicianId, reason: "EXCLUSIVE" };
  }

  const free = candidates.filter((r) => !busyTechnicianIds.has(r.technicianId));
  if (free.length === 0) return null;

  const preferred = free.filter((r) => !r.isFallbackOnly);
  const pool = preferred.length > 0 ? preferred : free;

  pool.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.technician.prioritySensitive !== b.technician.prioritySensitive) {
      return a.technician.prioritySensitive ? 1 : -1;
    }
    return a.technician.name.localeCompare(b.technician.name);
  });

  const chosen = pool[0];
  const reason: NonNullable<AssignResult>["reason"] = chosen.isPreferred
    ? "PREFERRED"
    : chosen.isPrimary
      ? "PRIMARY"
      : chosen.isFallbackOnly
        ? "FALLBACK"
        : "ONLY_OPTION";
  return { technicianId: chosen.technicianId, reason };
}

/**
 * DB-backed assignment. Loads candidates + the busy set for [startsAt, endsAt]
 * and runs the pure picker.
 */
export async function assignTechnician(args: AssignArgs): Promise<AssignResult> {
  const { clinicId, treatmentId, startsAt, endsAt, requestedTechnicianName } = args;

  const rules = await prisma.technicianTreatment.findMany({
    where: {
      treatmentId,
      technician: { clinicId },
    },
    include: {
      technician: {
        select: {
          id: true,
          name: true,
          active: true,
          prioritySensitive: true,
        },
      },
    },
  });

  if (rules.length === 0) return null;

  const techIds: string[] = rules.map((r: { technicianId: string }) => r.technicianId);

  const busyAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      technicianId: { in: techIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { technicianId: true },
  });

  const busyBlocks = await prisma.blockedSlot.findMany({
    where: {
      clinicId,
      OR: [{ technicianId: null }, { technicianId: { in: techIds } }],
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { technicianId: true },
  });

  const busy = new Set<string>(
    busyAppointments.map((a: { technicianId: string }) => a.technicianId),
  );
  // Clinic-wide block (technicianId === null) busies everyone.
  type BlockRow = { technicianId: string | null };
  if (busyBlocks.some((b: BlockRow) => b.technicianId === null)) {
    for (const id of techIds) busy.add(id);
  } else {
    for (const b of busyBlocks as BlockRow[]) {
      if (b.technicianId) busy.add(b.technicianId);
    }
  }

  return pickTechnician(rules as EligibleTechRule[], busy, requestedTechnicianName);
}
