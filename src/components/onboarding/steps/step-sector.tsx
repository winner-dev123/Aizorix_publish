"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTORS } from "@/lib/sectors";
import { useOnboarding } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";
import { cn } from "@/lib/utils";

export function StepSector() {
  const sectorId = useOnboarding((s) => s.sectorId);
  const setSector = useOnboarding((s) => s.setSector);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SECTORS.map((sector, i) => {
          const Icon = sector.icon;
          const selected = sectorId === sector.id;
          return (
            <button
              key={sector.id}
              type="button"
              onClick={() => setSector(sector.id)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 text-left card-hover anim-fade-up",
                selected
                  ? "border-[color:var(--color-brand-400)] bg-gradient-to-br from-[color:var(--color-brand-50)] to-white shadow-[0_18px_44px_-18px_rgba(0,128,105,0.55)] ring-4 ring-[color:var(--color-brand-200)]/60"
                  : "border-[color:var(--color-ink-100)] hover:border-[color:var(--color-ink-300)]",
              )}
              style={{ animationDelay: `${i * 20}ms` }}
            >
              {selected && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(0,128,105,0.5) 0%, transparent 60%)",
                  }}
                />
              )}
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-sm)] transition-all",
                      selected
                        ? "bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white"
                        : "bg-gradient-to-br from-[color:var(--color-surface-2)] to-white text-[color:var(--color-coral-500)] ring-1 ring-[color:var(--color-ink-100)] group-hover:scale-105",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {selected && (
                    <CheckCircle2 className="h-5 w-5 text-[color:var(--color-brand-600)]" />
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold tracking-tight text-[color:var(--color-ink-900)]">
                  {sector.name}
                </h3>
                <p className="mt-1.5 text-sm leading-snug text-[color:var(--color-ink-500)]">
                  {sector.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-brand-200)]/60 bg-gradient-to-br from-[color:var(--color-brand-50)] to-white p-6 shadow-[var(--shadow-sm)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,128,105,0.4) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-sm)]">
              <Lightbulb className="h-5 w-5 text-[color:var(--color-brand-600)]" />
            </div>
            <div>
              <p className="text-base font-bold text-[color:var(--color-ink-900)]">
                ¿No encuentras tu sector?
              </p>
              <p className="text-sm text-[color:var(--color-ink-600)]">
                Aizorix es 100% personalizable. Adaptamos módulos y flujos a
                cualquier tipo de negocio.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setSector("custom");
              router.push("/onboarding/negocio");
            }}
          >
            Personalizar mi sector
          </Button>
        </div>
      </div>

      <StepNav current={1} canContinue={!!sectorId} />
    </div>
  );
}
