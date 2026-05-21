import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessHoursForm } from "@/components/dashboard/business-hours-form";

export const revalidate = 30;

export default async function BusinessHoursPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/app/settings");
  }

  const rows = await prisma.clinicBusinessHours.findMany({
    where: { clinicId: session.user.clinicId },
    select: { dayOfWeek: true, opensAt: true, closesAt: true },
    orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }],
  });

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
            <Clock className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Horario de la clínica
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Estos horarios definen los huecos que la IA ofrece a los pacientes. Puedes añadir más
            de una franja por día (por ejemplo, mañana y tarde con descanso al mediodía).
          </p>
        </CardHeader>
        <CardContent>
          <BusinessHoursForm initial={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
