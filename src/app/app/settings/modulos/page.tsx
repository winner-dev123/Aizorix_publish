import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulesForm } from "@/components/dashboard/modules-form";
import {
  MODULE_CATALOGUE,
  isKnownModule,
  type ModuleKey,
} from "@/server/actions/module-catalogue";

export const revalidate = 30;

type SearchParams = Promise<{ disabled?: string }>;

export default async function ModulesSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  // Came in from a route-level gate? Surface a banner explaining why.
  const { disabled } = await searchParams;
  const disabledModule =
    disabled && isKnownModule(disabled)
      ? MODULE_CATALOGUE.find((m) => m.key === disabled)
      : undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      {disabledModule && (
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50 p-4 ring-1 ring-amber-200/60">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Módulo desactivado: {disabledModule.name}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Has intentado acceder a una sección que pertenece a un módulo que tu clínica
                tiene desactivado. Actívalo abajo para volver a entrar.
              </p>
            </div>
          </div>
        </div>
      )}

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
