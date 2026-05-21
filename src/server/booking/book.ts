import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { BookingError, DomainError } from "../errors";
import {
  isWithinBusinessHours,
  resolveWindowsForRange,
} from "../availability/business-hours";
import { withBookingRetry } from "./retry";

export type BookAppointmentArgs = {
  clinicId: string;
  patientId: string;
  treatmentId: string;
  technicianId: string;
  startsAt: Date;
  notes?: string;
  createdBy?: "BOT" | "HUMAN" | "STAFF";
  bypassLeadTime?: boolean;
  now?: Date;
};

/**
 * Books an appointment inside a Serializable transaction. Postgres will
 * detect read-then-write conflicts on the overlap check and abort, so
 * concurrent bookings for the same technician/slot can't both succeed.
 *
 * Validates (in order):
 *  1. treatment + technician + patient belong to the clinic,
 *  2. lead time (unless explicitly bypassed by staff),
 *  3. start/end fit inside an open business-hours window,
 *  4. technician is eligible (not excluded, treatment-exclusivity respected),
 *  5. no overlap with confirmed/pending appointments,
 *  6. no overlap with blocked slots.
 */
export async function bookAppointment(args: BookAppointmentArgs) {
  const {
    clinicId,
    patientId,
    treatmentId,
    technicianId,
    startsAt,
    notes,
    createdBy = "BOT",
    bypassLeadTime = false,
    now = new Date(),
  } = args;

  return withBookingRetry(
    () => prisma.$transaction(
    async (tx) => {
      const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) throw new DomainError("CLINIC_NOT_FOUND", "Clinic not found");

      const treatment = await tx.treatment.findUnique({ where: { id: treatmentId } });
      if (!treatment || treatment.clinicId !== clinicId) {
        throw new BookingError("TREATMENT_NOT_IN_CLINIC", "Treatment not in clinic");
      }

      const patient = await tx.patient.findUnique({ where: { id: patientId } });
      if (!patient || patient.clinicId !== clinicId) {
        throw new BookingError("PATIENT_NOT_IN_CLINIC", "Patient not in clinic");
      }

      const endsAt = addMinutes(
        startsAt,
        treatment.durationMinutes + treatment.bufferMinutes,
      );

      if (!bypassLeadTime) {
        const leadMs = clinic.minLeadMinutes * 60 * 1000;
        if (startsAt.getTime() - now.getTime() < leadMs) {
          throw new BookingError(
            "LEAD_TIME_TOO_SHORT",
            `Appointment must be at least ${clinic.minLeadMinutes} minutes in the future`,
          );
        }
      }

      const hours = await tx.clinicBusinessHours.findMany({ where: { clinicId } });
      const windows = resolveWindowsForRange({
        from: startsAt,
        to: endsAt,
        timezone: clinic.timezone,
        rows: hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          opensAt: h.opensAt,
          closesAt: h.closesAt,
        })),
      });

      if (!isWithinBusinessHours(startsAt, endsAt, windows)) {
        throw new BookingError(
          "OUTSIDE_BUSINESS_HOURS",
          "Appointment is outside clinic business hours",
        );
      }

      const tt = await tx.technicianTreatment.findUnique({
        where: {
          technicianId_treatmentId: { technicianId, treatmentId },
        },
        include: { technician: true },
      });
      if (!tt || tt.isExcluded) {
        throw new BookingError(
          "TECHNICIAN_NOT_ELIGIBLE",
          "Technician cannot perform this treatment",
        );
      }
      if (!tt.technician.active || tt.technician.clinicId !== clinicId) {
        throw new BookingError("TECHNICIAN_INACTIVE", "Technician is not available");
      }

      const exclusive = await tx.technicianTreatment.findFirst({
        where: { treatmentId, isExclusive: true },
      });
      if (exclusive && exclusive.technicianId !== technicianId) {
        throw new BookingError(
          "TECHNICIAN_NOT_EXCLUSIVE",
          "This treatment must be performed by a specific technician",
        );
      }

      const overlap = await tx.appointment.findFirst({
        where: {
          clinicId,
          technicianId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (overlap) {
        throw new BookingError("OVERLAP", "Technician already has an appointment in this slot");
      }

      const block = await tx.blockedSlot.findFirst({
        where: {
          clinicId,
          OR: [{ technicianId: null }, { technicianId }],
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (block) {
        throw new BookingError("BLOCKED", "Requested slot is blocked");
      }

      return tx.appointment.create({
        data: {
          clinicId,
          patientId,
          treatmentId,
          technicianId,
          startsAt,
          endsAt,
          status: "CONFIRMED",
          notes,
          createdBy,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ),
  { label: "book" },
  );
}
