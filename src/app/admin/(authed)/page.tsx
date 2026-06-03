import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Stethoscope,
  Users,
} from "lucide-react";
import { prisma } from "@/server/db";

export const revalidate = 0;

/**
 * Platform-admin dashboard. Five at-a-glance counters (clinics,
 * patients, technicians, appointments, conversations) — cross-tenant
 * aggregates so the operator can spot trends without drilling in.
 *
 * The route is gated by the (authed) group's layout, so by the time
 * this component runs we already know the caller is a platform admin.
 */
export default async function AdminDashboardPage() {
  const [clinicCount, patientCount, technicianCount, appointmentCount] =
    await Promise.all([
      prisma.clinic.count(),
      prisma.patient.count(),
      prisma.technician.count(),
      prisma.appointment.count(),
    ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-600)] dark:text-[color:var(--color-brand-300)]">
          Cross-tenant
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
          Vista global de la plataforma
        </h1>
        <p className="mt-1.5 text-sm text-[color:var(--color-ink-600)]">
          Datos agregados de todas las clínicas. Cada acción que realizas
          desde aquí queda registrada en el audit log de la clínica
          afectada.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Clínicas"
          value={clinicCount}
          icon={Building2}
          href="/admin/clinics"
        />
        <StatTile
          label="Pacientes"
          value={patientCount}
          icon={Users}
          href="/admin/patients"
        />
        <StatTile
          label="Técnicos"
          value={technicianCount}
          icon={Stethoscope}
          href="/admin/technicians"
        />
        <StatTile
          label="Citas"
          value={appointmentCount}
          icon={ArrowRight}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickLinkCard
          href="/admin/patients"
          title="Gestionar pacientes"
          subtitle="Buscar y eliminar pacientes de cualquier clínica."
          icon={Users}
        />
        <QuickLinkCard
          href="/admin/technicians"
          title="Gestionar técnicos"
          subtitle="Buscar y eliminar técnicos de cualquier clínica."
          icon={Stethoscope}
        />
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-[color:var(--color-ink-100)] dark:border-white/10 bg-[color:var(--color-surface-1)] p-5 shadow-[var(--shadow-sm)] transition hover:border-[color:var(--color-brand-400)]/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)]">
            {label}
          </p>
          <p className="mt-1.5 text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
            {value.toLocaleString("es-ES")}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-white shadow-[0_6px_14px_-6px_rgba(124,58,237,0.55)]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickLinkCard({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: typeof Users;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-[color:var(--color-ink-100)] dark:border-white/10 bg-[color:var(--color-surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--color-brand-400)]/40 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-ink-50)] dark:bg-white/[0.05] text-[color:var(--color-ink-900)]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[color:var(--color-ink-900)]">{title}</p>
        <p className="mt-0.5 text-xs text-[color:var(--color-ink-500)]">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[color:var(--color-ink-400)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--color-ink-900)]" />
    </Link>
  );
}
