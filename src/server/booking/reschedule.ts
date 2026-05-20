import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { BookingError, DomainError } from "../errors";
import {
  isWithinBusinessHours,
  resolveWindowsForRange,
} from "../availability/business-hours";

export type RescheduleArgs = {
  appointmentId: string;
  clinicId: string;
  newStartsAt: Date;
  newTechnicianId?: string;
  bypassLeadTime?: boolean;
  now?: Date;
};

export async function rescheduleAppointment(args: RescheduleArgs) {
  const {
    appointmentId,
    clinicId,
    newStartsAt,
    newTechnicianId,
    bypassLeadTime = false,
    now = new Date(),
  } = args;

  return prisma.$transaction(
    async (tx) => {
      const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) throw new DomainError("CLINIC_NOT_FOUND", "Clinic not found");

      const appt = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { treatment: true },
      });
      if (!appt || appt.clinicId !== clinicId) {
        throw new BookingError("APPOINTMENT_NOT_FOUND", "Appointment not found");
      }
      if (appt.status === "CANCELLED" || appt.status === "COMPLETED") {
        throw new BookingError(
          "APPOINTMENT_NOT_CANCELLABLE",
          `Cannot reschedule appointment in status ${appt.status}`,
        );
      }

      const technicianId = newTechnicianId ?? appt.technicianId;
      const newEndsAt = addMinutes(
        newStartsAt,
        appt.treatment.durationMinutes + appt.treatment.bufferMinutes,
      );

      if (!bypassLeadTime) {
        const leadMs = clinic.minLeadMinutes * 60 * 1000;
        if (newStartsAt.getTime() - now.getTime() < leadMs) {
          throw new BookingError(
            "LEAD_TIME_TOO_SHORT",
            `New appointment time must be at least ${clinic.minLeadMinutes} minutes in the future`,
          );
        }
      }

      const hours = await tx.clinicBusinessHours.findMany({ where: { clinicId } });
      const windows = resolveWindowsForRange({
        from: newStartsAt,
        to: newEndsAt,
        timezone: clinic.timezone,
        rows: hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          opensAt: h.opensAt,
          closesAt: h.closesAt,
        })),
      });
      if (!isWithinBusinessHours(newStartsAt, newEndsAt, windows)) {
        throw new BookingError(
          "OUTSIDE_BUSINESS_HOURS",
          "New time is outside business hours",
        );
      }

      if (newTechnicianId && newTechnicianId !== appt.technicianId) {
        const tt = await tx.technicianTreatment.findUnique({
          where: {
            technicianId_treatmentId: {
              technicianId: newTechnicianId,
              treatmentId: appt.treatmentId,
            },
          },
          include: { technician: true },
        });
        if (!tt || tt.isExcluded || !tt.technician.active) {
          throw new BookingError(
            "TECHNICIAN_NOT_ELIGIBLE",
            "Technician cannot perform this treatment",
          );
        }
      }

      const overlap = await tx.appointment.findFirst({
        where: {
          clinicId,
          technicianId,
          status: { in: ["PENDING", "CONFIRMED"] },
          id: { not: appointmentId },
          startsAt: { lt: newEndsAt },
          endsAt: { gt: newStartsAt },
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
          startsAt: { lt: newEndsAt },
          endsAt: { gt: newStartsAt },
        },
        select: { id: true },
      });
      if (block) {
        throw new BookingError("BLOCKED", "Requested slot is blocked");
      }

      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          technicianId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
