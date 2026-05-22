import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Mail, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOGUE } from "@/server/actions/plan-catalogue";
import { formatEUR } from "@/lib/utils";

export const revalidate = 60;

export default async function FacturacionSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/app/settings");
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { name: true, plan: true, activeModules: true, createdAt: true },
  });
  if (!clinic) redirect("/signin");

  const current = PLAN_CATALOGUE[clinic.plan];
  const memberSinceLabel = clinic.createdAt.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Facturación
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Tu plan actual y lo que incluye. Para cambiar de plan, contacta con el equipo de
            Aizorix — no es self-service todavía.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current plan summary */}
          <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-brand-200)]/60 bg-gradient-to-br from-[color:var(--color-brand-50)] to-white p-6">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,128,105,0.55) 0%, transparent 60%)",
              }}
            />
            <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
                  <Sparkles className="h-3.5 w-3.5" /> Plan {current.name}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                  {clinic.name}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-[color:var(--color-ink-600)]">
                  {current.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="brand">{current.name}</Badge>
                  <Badge variant="outline">
                    {clinic.activeModules.length}{" "}
                    {clinic.activeModules.length === 1 ? "módulo activo" : "módulos activos"}
                  </Badge>
                  <Badge variant="outline">Cliente desde {memberSinceLabel}</Badge>
                </div>
              </div>
              <div className="text-right">
                {current.monthlyEUR > 0 ? (
                  <>
                    <p className="text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                      {formatEUR(current.monthlyEUR)}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-500)]">/ mes · IVA aparte</p>
                  </>
                ) : current.key === "ENTERPRISE" ? (
                  <p className="text-sm font-bold text-[color:var(--color-ink-700)]">
                    Precio negociado
                  </p>
                ) : (
                  <p className="text-sm font-bold text-[color:var(--color-ink-700)]">
                    Sin coste
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* What this plan includes */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
              Incluido en tu plan
            </p>
            <ul className="mt-3 space-y-2">
              {current.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-[color:var(--color-ink-800)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact CTA */}
          <div className="rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-5">
            <p className="text-sm font-bold text-[color:var(--color-ink-900)]">
              ¿Quieres cambiar de plan o consultar facturas?
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-ink-600)]">
              Escríbenos y te ajustamos el plan a tu volumen real. Las facturas mensuales se
              envían por email — coméntanos el correo de administración.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <a href="mailto:billing@aizorix.dev">
                <Mail className="h-4 w-4" /> billing@aizorix.dev
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
