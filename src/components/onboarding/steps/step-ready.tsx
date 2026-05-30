"use client";

import Link from "next/link";
import { CheckCircle2, PartyPopper, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSector } from "@/lib/sectors";
import { MODULES } from "@/lib/modules";
import { useOnboarding } from "@/lib/store/onboarding-store";
import { formatEUR } from "@/lib/utils";

export function StepReady() {
  const state = useOnboarding();
  const sector = getSector(state.sectorId);
  const activeModules = MODULES.filter(
    (m) => state.modules.includes(m.id) || m.required,
  );
  const monthlyTotal = activeModules.reduce(
    (sum, m) => sum + m.priceMonthly,
    0,
  );

  return (
    <div className="flex flex-col gap-7">
      {/* Celebration banner — bright */}
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-[#effdf6] via-[#e6f4f1] to-[#f5f3ff] p-8 shadow-[var(--shadow-lg)] dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-80 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,211,102,0.6) 0%, transparent 60%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(155,140,255,0.45) 0%, transparent 60%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-12 top-10 h-44 w-44 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(13,148,136,0.4) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_14px_36px_-12px_rgba(13,148,136,0.6)]">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <Badge variant="brand" className="mb-2">
              <Sparkles className="h-3 w-3" /> Configuración completa
            </Badge>
            <h3 className="text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
              ¡Tu CRM con IA está listo!
            </h3>
            <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">
              Activación final del ecosistema IA + CRM + Agenda +
              Automatizaciones.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary label="Sector" value={sector?.name ?? "Personalizado"} accent />
        <Summary label="Negocio" value={state.business.name || "—"} />
        <Summary label="Sedes" value={`${state.locations.length}`} />
        <Summary label="Empleados" value={`${state.employees.length}`} />
        <Summary label="Servicios" value={`${state.services.length}`} />
        <Summary
          label="Canales activos"
          value={
            Object.entries(state.channels)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ") || "—"
          }
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white p-6 shadow-[var(--shadow-sm)] dark:border-white/10 dark:bg-[color:var(--color-surface-1)]">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
          Módulos contratados
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {activeModules.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] px-3 py-2.5 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-[color:var(--color-ink-900)]">
                {m.name}
              </span>
              <span className="ml-auto text-xs font-bold text-[color:var(--color-ink-500)]">
                {formatEUR(m.priceMonthly)} / mes
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-50)] to-white px-5 py-4 ring-1 ring-[color:var(--color-brand-200)]/50 dark:bg-none dark:bg-[color:var(--color-surface-2)] dark:ring-white/15">
          <p className="text-sm font-bold text-[color:var(--color-ink-900)]">
            Total mensual
          </p>
          <p className="text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
            {formatEUR(monthlyTotal)}{" "}
            <span className="text-sm font-medium text-[color:var(--color-ink-500)]">
              / mes
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink-700)]">
          <Sparkles className="h-4 w-4 text-[color:var(--color-brand-500)]" />
          Tu primer mes es gratis. Sin permanencia.
        </p>
        <Button asChild variant="accent" size="lg">
          <Link href="/app">
            Entrar al CRM <Rocket />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-[color:var(--color-brand-200)]/60 bg-gradient-to-br from-[color:var(--color-brand-50)] to-white dark:bg-none dark:bg-[color:var(--color-surface-2)] dark:border-white/15"
          : "border-[color:var(--color-ink-100)] bg-white dark:border-white/10 dark:bg-[color:var(--color-surface-1)]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
        {label}
      </p>
      <p className="mt-1.5 truncate text-base font-bold text-[color:var(--color-ink-900)]">
        {value}
      </p>
    </div>
  );
}
