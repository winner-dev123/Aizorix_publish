"use client";

import Link from "next/link";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepProgressProps {
  current: number;
}

export function StepProgress({ current }: StepProgressProps) {
  const total = ONBOARDING_STEPS.length;
  const pct = Math.round(((current - 1) / (total - 1)) * 100);

  return (
    <div className="space-y-4 rounded-3xl border border-[color:var(--color-ink-100)] bg-white/80 p-5 shadow-[var(--shadow-sm)] backdrop-blur">
      {/* Top: percentage */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
            Progreso del onboarding
          </p>
          <p className="text-sm font-semibold text-[color:var(--color-ink-900)]">
            Paso {current} de {total} ·{" "}
            <span className="text-[color:var(--color-brand-600)]">{pct}%</span>
          </p>
        </div>
        <span className="hidden rounded-full bg-gradient-to-br from-[#25d366] to-[#0d9488] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[color:var(--color-ink-900)] shadow-sm sm:inline-block">
          {pct}%
        </span>
      </div>

      {/* Bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--color-ink-100)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#25d366] via-[#14b87a] to-[#0d9488] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="w-full overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-0">
          {ONBOARDING_STEPS.map((step, idx) => {
            const status: "done" | "current" | "upcoming" =
              step.num < current
                ? "done"
                : step.num === current
                ? "current"
                : "upcoming";
            const isLast = idx === ONBOARDING_STEPS.length - 1;
            return (
              <li key={step.num} className="flex items-center">
                <Link
                  href={`/onboarding/${step.slug}`}
                  className="group flex flex-col items-center gap-1.5"
                  aria-current={status === "current" ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black transition-all duration-300",
                      status === "current" &&
                        "bg-gradient-to-br from-[#25d366] via-[#14b87a] to-[#0d9488] text-[color:var(--color-ink-900)] shadow-[0_10px_22px_-6px_rgba(13,148,136,0.55)] ring-4 ring-white",
                      status === "done" &&
                        "bg-gradient-to-br from-[#7eddb4] to-[#20bf7c] text-white shadow-[0_6px_14px_-6px_rgba(32,191,124,0.55)]",
                      status === "upcoming" &&
                        "border-2 border-[color:var(--color-ink-200)] bg-white text-[color:var(--color-ink-400)] group-hover:border-[color:var(--color-ink-400)]",
                    )}
                  >
                    {status === "done" ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      step.num
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                      status === "current"
                        ? "text-[color:var(--color-coral-500)]"
                        : status === "done"
                        ? "text-[color:var(--color-mint-500)]"
                        : "text-[color:var(--color-ink-400)]",
                    )}
                  >
                    {step.short}
                  </span>
                </Link>
                {!isLast && (
                  <span
                    className={cn(
                      "mx-2 h-[3px] w-8 rounded-full transition-colors",
                      step.num < current
                        ? "bg-gradient-to-r from-[#7eddb4] to-[#20bf7c]"
                        : "bg-[color:var(--color-ink-100)]",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
