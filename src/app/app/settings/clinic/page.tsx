import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicForm } from "@/components/dashboard/clinic-form";

export const revalidate = 30;

export default async function ClinicSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    // RECEPTIONIST/STAFF see the read-only overview on /app/settings; this
    // edit form is admin-only. Bounce them back.
    redirect("/app/settings");
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
  });
  if (!clinic) redirect("/signin");

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Datos del negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicForm
            defaults={{
              name: clinic.name,
              timezone: clinic.timezone,
              locale: clinic.locale,
              whatsappNumber: clinic.whatsappNumber,
              minLeadMinutes: clinic.minLeadMinutes,
              slotGranularityMin: clinic.slotGranularityMin,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
