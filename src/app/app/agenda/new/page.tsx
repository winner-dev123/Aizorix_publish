import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NewAppointmentForm,
  type PatientOption,
  type TreatmentOption,
  type TechnicianOption,
} from "@/components/dashboard/new-appointment-form";

export const revalidate = 0; // Always fresh — the form is the user's primary action.

/** Round up to the next 15-minute boundary in the clinic's timezone, format as YYYY-MM-DDTHH:mm. */
function nextSlotLocal(timezone: string, leadMinutes: number): string {
  const now = new Date();
  const lead = new Date(now.getTime() + leadMinutes * 60 * 1000);
  const rounded = new Date(Math.ceil(lead.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
  return formatInTimeZone(rounded, timezone, "yyyy-MM-dd'T'HH:mm");
}

export default async function NewAppointmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { timezone: true, minLeadMinutes: true },
  });
  if (!clinic) redirect("/signin");

  const [patientsRaw, treatmentsRaw, techniciansRaw] = await Promise.all([
    prisma.patient.findMany({
      where: { clinicId },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.treatment.findMany({
      where: { clinicId, active: true },
      select: { id: true, name: true, durationMinutes: true },
      orderBy: { name: "asc" },
    }),
    prisma.technician.findMany({
      where: { clinicId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const patients: PatientOption[] = patientsRaw.map((p) => ({
    id: p.id,
    label: `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`,
    phone: p.phone,
  }));
  const treatments: TreatmentOption[] = treatmentsRaw;
  const technicians: TechnicianOption[] = techniciansRaw;

  const minStartsAtLocal = nextSlotLocal(clinic.timezone, clinic.minLeadMinutes);

  return (
    <div className="space-y-6">
      <Link
        href="/app/agenda"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la agenda
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Nueva cita manual
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Crea una cita desde el panel (sin pasar por el bot). Se valida igual que las
            reservas automáticas: horarios de apertura, solapamientos y elegibilidad del técnico.
          </p>
        </CardHeader>
        <CardContent>
          <NewAppointmentForm
            patients={patients}
            treatments={treatments}
            technicians={technicians}
            minStartsAtLocal={minStartsAtLocal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
