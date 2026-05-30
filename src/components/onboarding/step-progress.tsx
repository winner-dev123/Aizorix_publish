"use client";

import Link from "next/link";
import { ONBOARDING_STEPS, getStepDictKey } from "@/lib/onboarding-steps";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-context";
import { Check } from "lucide-react";

interface StepProgressProps {
  current: number;
}

/**
 * Horizontal numbered timeline shown at the top of every onboarding page.
 * Mirrors the Aizorix AI reference mocks: clean numbered circles connected by
 * thin lines, label under each circle, no surrounding card. Style variants:
 *
 *   - upcoming : hollow circle, muted label
 *   - current  : violet gradient circle with halo + violet label
 *   - done     : violet-filled circle with a check + label in normal ink
 */
export function StepProgress({ current }: StepProgressProps) {
  const { t } = useT();
  return (
    <div className="w-full overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start gap-0">
        {ONBOARDING_STEPS.map((step, idx) => {
          const dictKey = getStepDictKey(step.slug);
          const short = dictKey
            ? t.onboarding.steps[dictKey].short
            : step.short;
          const status: "done" | "current" | "upcoming" =
            step.num < current
              ? "done"
              : step.num === current
              ? "current"
              : "upcoming";
          const isLast = idx === ONBOARDING_STEPS.length - 1;

          return (
            <li key={step.num} className="flex flex-1 items-start">
              <Link
                href={`/onboarding/${step.slug}`}
                aria-current={status === "current" ? "step" : undefined}
                className="group flex min-w-[6.5rem] flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-all duration-300",
                    status === "current" &&
                      "bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_0_0_4px_rgba(139,92,246,0.18),0_8px_24px_-6px_rgba(124,58,237,0.55)]",
                    status === "done" &&
                      "bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.45)]",
                    status === "upcoming" &&
                      "border-2 border-[color:var(--color-ink-200)] bg-white text-[color:var(--color-ink-400)] group-hover:border-[color:var(--color-ink-400)] dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55 dark:group-hover:border-white/30",
                  )}
                >
                  {status === "done" ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    step.num
                  )}
                  {status === "current" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full opacity-50 blur-md"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 65%)",
                      }}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "max-w-[7.5rem] text-center text-[11px] font-bold leading-tight whitespace-normal transition-colors",
                    status === "current" &&
                      "text-[color:var(--color-brand-600)] dark:text-[color:var(--color-brand-300)]",
                    status === "done" &&
                      "text-[color:var(--color-ink-700)] dark:text-white/80",
                    status === "upcoming" &&
                      "text-[color:var(--color-ink-400)] dark:text-white/45",
                  )}
                >
                  {short}
                </span>
              </Link>
              {!isLast && (
                <span
                  className={cn(
                    "mt-5 h-[2px] flex-1 min-w-[1.5rem] rounded-full transition-colors",
                    step.num < current
                      ? "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6]"
                      : "bg-[color:var(--color-ink-200)] dark:bg-white/12",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
