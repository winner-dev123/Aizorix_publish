import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EditPatientForm,
  type EditPatientDefaults,
} from "@/components/dashboard/edit-patient-form";

export const revalidate = 0;

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: session.user.clinicId },
  });
  if (!patient) return notFound();

  const defaults: EditPatientDefaults = {
    patientId: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName ?? "",
    phone: patient.phone,
    email: patient.email ?? "",
    gender: (patient.gender === "FEMALE" || patient.gender === "MALE" ? patient.gender : "") as
      | "FEMALE"
      | "MALE"
      | "",
    dob: patient.dob ? patient.dob.toISOString().slice(0, 10) : "",
    source: patient.source ?? "",
    notes: patient.notes ?? "",
    status: patient.status,
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/app/clients/${patient.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la ficha
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Editar ficha · {patient.firstName}
            {patient.lastName ? ` ${patient.lastName}` : ""}
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Cambia los datos del paciente. El teléfono se valida contra otros pacientes de la
            clínica — si lo cambias a uno ya registrado verás un error claro.
          </p>
        </CardHeader>
        <CardContent>
          <EditPatientForm defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}
