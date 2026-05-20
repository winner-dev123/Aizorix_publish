import { prisma } from "../db";
import { BookingError } from "../errors";

export type CancelAppointmentArgs = {
  appointmentId: string;
  clinicId: string;
  reason?: string;
  now?: Date;
};

export async function cancelAppointment(args: CancelAppointmentArgs) {
  const { appointmentId, clinicId, reason, now = new Date() } = args;

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!existing || existing.clinicId !== clinicId) {
    throw new BookingError("APPOINTMENT_NOT_FOUND", "Appointment not found");
  }
  if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
    throw new BookingError(
      "APPOINTMENT_NOT_CANCELLABLE",
      `Appointment already in status ${existing.status}`,
    );
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancelReason: reason,
    },
  });
}
