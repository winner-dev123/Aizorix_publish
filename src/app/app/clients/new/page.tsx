import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewPatientForm } from "@/components/dashboard/new-patient-form";

export const revalidate = 0;

export default async function NewPatientPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="space-y-6">
      <Link
        href="/app/clients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Nuevo paciente
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Crea una ficha manualmente — útil cuando el paciente llega por teléfono o en persona
            antes de escribir por WhatsApp. El bot reconocerá su número en futuros mensajes.
          </p>
        </CardHeader>
        <CardContent>
          <NewPatientForm />
        </CardContent>
      </Card>
    </div>
  );
}
