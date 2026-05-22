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

type SearchParams = Promise<{ patientId?: string }>;

/** Round up to the next 15-minute boundary in the clinic's timezone, format as YYYY-MM-DDTHH:mm. */
function nextSlotLocal(timezone: string, leadMinutes: number): string {
  const now = new Date();
  const lead = new Date(now.getTime() + leadMinutes * 60 * 1000);
  const rounded = new Date(Math.ceil(lead.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
  return formatInTimeZone(rounded, timezone, "yyyy-MM-dd'T'HH:mm");
}

function patientLabel(p: { firstName: string; lastName: string | null }) {
  return `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`;
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;

  const { patientId: requestedPatientId } = await searchParams;

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

  // If the URL specified a patient that isn't in the top-100 most-recent
  // list (because they're older or there are more than 100 patients in
  // the clinic), fetch that one explicitly and prepend it. Clinic-scoped
  // so a malicious `?patientId=…` can't reach another tenant.
  let extraPatient: { id: string; firstName: string; lastName: string | null; phone: string } | null = null;
  if (requestedPatientId && !patientsRaw.some((p) => p.id === requestedPatientId)) {
    extraPatient = await prisma.patient.findFirst({
      where: { id: requestedPatientId, clinicId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
  }

  const patients: PatientOption[] = (extraPatient ? [extraPatient, ...patientsRaw] : patientsRaw).map((p) => ({
    id: p.id,
    label: patientLabel(p),
    phone: p.phone,
  }));

  // Only honor the prefill when the patient actually exists for this clinic.
  const defaultPatientId =
    requestedPatientId && patients.some((p) => p.id === requestedPatientId)
      ? requestedPatientId
      : undefined;

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
            defaultPatientId={defaultPatientId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
