"use client";

import { useMemo } from "react";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { useOnboarding } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";
import { formatEUR, cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  core: "Núcleo",
  ai: "Inteligencia Artificial",
  integrations: "Integraciones",
  addon: "Complementos",
};

export function StepModules() {
  const modules = useOnboarding((s) => s.modules);
  const toggleModule = useOnboarding((s) => s.toggleModule);

  const grouped = useMemo(() => {
    return MODULES.reduce<Record<string, typeof MODULES>>((acc, m) => {
      (acc[m.category] ||= []).push(m);
      return acc;
    }, {});
  }, []);

  const monthlyTotal = useMemo(
    () =>
      MODULES.filter((m) => modules.includes(m.id) || m.required).reduce(
        (sum, m) => sum + m.priceMonthly,
        0,
      ),
    [modules],
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-8">
        {(["core", "ai", "integrations", "addon"] as const).map((cat) => (
          <div key={cat}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-ink-400)]">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {grouped[cat]?.map((m) => {
                const Icon = m.icon;
                const active = modules.includes(m.id) || m.required;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => !m.required && toggleModule(m.id)}
                    disabled={m.required}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 text-left card-hover",
                      active
                        ? "border-[color:var(--color-ink-900)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] shadow-[var(--shadow-md)]"
                        : "border-[color:var(--color-ink-100)] hover:border-[color:var(--color-ink-300)]",
                      m.required && "cursor-not-allowed",
                    )}
                  >
                    {active && !m.required && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(0,128,105,0.5) 0%, transparent 60%)",
                        }}
                      />
                    )}
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl shadow-[var(--shadow-sm)] transition",
                            active
                              ? "bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white"
                              : "bg-[color:var(--color-ink-50)] text-[color:var(--color-ink-500)]",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        {m.required ? (
                          <span className="flex items-center gap-1 rounded-full bg-[color:var(--color-ink-100)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-600)]">
                            <Lock className="h-3 w-3" /> Incluido
                          </span>
                        ) : active ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-base font-bold tracking-tight text-[color:var(--color-ink-900)]">
                        {m.name}
                      </h3>
                      <p className="mt-1 text-sm text-[color:var(--color-ink-500)]">
                        {m.description}
                      </p>
                      <p className="mt-4 flex items-baseline gap-1">
                        <span className="text-xl font-black text-[color:var(--color-ink-900)]">
                          {formatEUR(m.priceMonthly)}
                        </span>{" "}
                        <span className="text-xs font-medium text-[color:var(--color-ink-500)]">
                          / mes
                        </span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-[#effdf6] via-[#e6f4f1] to-[#f5f3ff] p-5 shadow-[var(--shadow-xl)] backdrop-blur">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(13,148,136,0.45) 0%, transparent 60%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(155,140,255,0.4) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-coral-500)]">
            <Sparkles className="h-3.5 w-3.5" /> Total mensual estimado
          </p>
          <p className="mt-1 text-3xl font-black text-brand-gradient">
            {formatEUR(monthlyTotal)}{" "}
            <span className="text-sm font-medium text-[color:var(--color-ink-500)]">
              / mes
            </span>
          </p>
        </div>
        <div className="relative">
          <StepNav current={6} />
        </div>
      </div>
    </div>
  );
}
