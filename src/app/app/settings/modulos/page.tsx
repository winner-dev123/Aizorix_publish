import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulesForm } from "@/components/dashboard/modules-form";
import { isKnownModule, type ModuleKey } from "@/server/actions/module-catalogue";

export const revalidate = 30;

export default async function ModulesSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/app/settings");
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { activeModules: true },
  });
  if (!clinic) redirect("/signin");

  // Filter against the catalogue in case the DB carries a legacy key.
  const initial: ModuleKey[] = clinic.activeModules.filter(isKnownModule);

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
            <Layers className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Módulos contratados
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Activa o desactiva módulos según lo que use tu clínica. Los cambios se persisten al
            instante.
          </p>
        </CardHeader>
        <CardContent>
          <ModulesForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
