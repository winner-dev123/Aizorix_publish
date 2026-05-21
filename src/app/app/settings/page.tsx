import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Clock,
  CreditCard,
  Layers,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { getClinicOverview } from "@/server/dashboard/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 30;

const SECTIONS = [
  {
    icon: Building2,
    title: "Datos del negocio",
    desc: "Nombre, zona horaria, idioma y número de WhatsApp.",
    color: "from-amber-500/15 to-amber-500/5",
    href: "/app/settings/clinic" as const,
  },
  {
    icon: Clock,
    title: "Horarios de la clínica",
    desc: "Franjas de apertura por día de la semana.",
    color: "from-sky-500/15 to-sky-500/5",
    href: "/app/settings/hours" as const,
  },
  {
    icon: Users,
    title: "Empleados y permisos",
    desc: "Invita personal, asigna roles y desactiva accesos.",
    color: "from-violet-500/15 to-violet-500/5",
    href: "/app/settings/staff" as const,
  },
  {
    icon: Bot,
    title: "IA Recepcionista",
    desc: "Tono del bot e instrucciones específicas de la clínica.",
    color: "from-emerald-500/15 to-emerald-500/5",
    href: "/app/settings/ai" as const,
  },
  {
    icon: Layers,
    title: "Módulos contratados",
    desc: "Activa o desactiva módulos según necesites.",
    color: "from-sky-500/15 to-sky-500/5",
    href: null,
  },
  {
    icon: CreditCard,
    title: "Facturación",
    desc: "Plan, método de pago y facturas emitidas.",
    color: "from-rose-500/15 to-rose-500/5",
    href: null,
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const overview = await getClinicOverview(session.user.clinicId);
  if (!overview) redirect("/signin");
  const { clinic, userCount, treatmentCount, technicianCount, businessHoursCount } = overview;

  return (
    <div className="space-y-6">
      {/* Clinic snapshot — real data */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                <Building2 className="h-3.5 w-3.5" /> Clínica
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                {clinic.name}
              </h2>
              <p className="mt-0.5 text-sm text-[color:var(--color-ink-500)]">
                {clinic.slug} · {clinic.timezone} · {clinic.locale}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {clinic.whatsappNumber ? (
                  <Badge variant="success">
                    <MessageCircle className="h-3 w-3" /> WhatsApp: {clinic.whatsappNumber}
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <MessageCircle className="h-3 w-3" /> Sin número de WhatsApp
                  </Badge>
                )}
                <Badge variant="outline">
                  <Clock className="h-3 w-3" /> Lead mínimo {clinic.minLeadMinutes} min
                </Badge>
                <Badge variant="outline">Slot {clinic.slotGranularityMin} min</Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Users} label="Personal activo" value={userCount} />
            <Stat icon={Stethoscope} label="Tratamientos" value={treatmentCount} />
            <Stat icon={Bot} label="Técnicas/personas" value={technicianCount} />
            <Stat icon={Clock} label="Franjas horarias" value={businessHoursCount} />
          </div>
        </CardContent>
      </Card>

      <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-brand-200)]/60 bg-gradient-to-br from-[color:var(--color-brand-50)] to-white p-7 shadow-[var(--shadow-sm)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(245,200,66,0.55) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
              <Sparkles className="h-3.5 w-3.5" /> Asistente de configuración
            </div>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
              ¿Quieres rehacer el onboarding?
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[color:var(--color-ink-600)]">
              Puedes volver a ejecutar el asistente paso a paso en cualquier
              momento — sin perder ninguna configuración existente.
            </p>
          </div>
          <Button asChild variant="primary" size="lg">
            <Link href="/onboarding">
              <RefreshCw /> Volver al onboarding
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const card = (
            <Card
              className={`relative overflow-hidden bg-gradient-to-br ${s.color} card-hover ${s.href ? "" : "opacity-70"}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[color:var(--color-ink-900)] shadow-[var(--shadow-sm)]">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="sm" disabled={!s.href}>
                    {s.href ? "Configurar" : "Próximamente"} <ArrowRight />
                  </Button>
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-[color:var(--color-ink-900)]">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">{s.desc}</p>
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.title} href={s.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={s.title}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-sm)]">
        <Icon className="h-4 w-4 text-[color:var(--color-ink-700)]" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
          {label}
        </p>
        <p className="text-xl font-black tracking-tight text-[color:var(--color-ink-900)]">{value}</p>
      </div>
    </div>
  );
}
