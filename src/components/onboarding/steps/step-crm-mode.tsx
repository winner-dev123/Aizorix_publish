"use client";

import { Briefcase, ExternalLink, Sparkles } from "lucide-react";
import { useOnboarding, type CrmMode } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/**
 * Step 0 — the very first decision in the onboarding flow.
 *
 * The user picks how they want to operate Aizorix:
 *
 *   1. AIZORIX   — full CRM stack (default)
 *   2. EXTERNAL  — keep their current CRM; Aizorix syncs via the public
 *                  REST API (`POST /api/v1/patients` + token)
 *   3. NONE      — IA + WhatsApp + agenda only; the CRM module gets
 *                  disabled at activation time
 *
 * The choice is persisted on `OnboardingState.crmMode` and read by
 * later steps (e.g. step-ai branches into "mint API token" instructions
 * for the EXTERNAL mode) and at activation to set the clinic's
 * `activeModules` array correctly.
 */
export function StepCrmMode() {
  const crmMode = useOnboarding((s) => s.crmMode);
  const setCrmMode = useOnboarding((s) => s.setCrmMode);
  const { t } = useT();
  const modeT = t.onboarding.crmMode;

  const OPTIONS: Array<{
    id: CrmMode;
    icon: typeof Sparkles;
    title: string;
    description: string;
    bullets: string[];
    recommended?: boolean;
  }> = [
    {
      id: "aizorix",
      icon: Sparkles,
      title: modeT.aizorixTitle,
      description: modeT.aizorixDesc,
      bullets: [
        modeT.aizorixBullet1,
        modeT.aizorixBullet2,
        modeT.aizorixBullet3,
      ],
      recommended: true,
    },
    {
      id: "external",
      icon: ExternalLink,
      title: modeT.externalTitle,
      description: modeT.externalDesc,
      bullets: [
        modeT.externalBullet1,
        modeT.externalBullet2,
        modeT.externalBullet3,
      ],
    },
    {
      id: "none",
      icon: Briefcase,
      title: modeT.noneTitle,
      description: modeT.noneDesc,
      bullets: [
        modeT.noneBullet1,
        modeT.noneBullet2,
        modeT.noneBullet3,
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      <p className="text-sm text-[color:var(--color-ink-500)] dark:text-white/65">
        {modeT.subtitle}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map((opt) => {
          const active = crmMode === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCrmMode(opt.id)}
              aria-pressed={active}
              className={cn(
                "group relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all",
                active
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)]/60 shadow-[var(--glow-violet-soft)] dark:bg-[color:var(--color-brand-500)]/15 dark:border-[color:var(--color-brand-400)]"
                  : "border-[color:var(--color-ink-200)] hover:border-[color:var(--color-brand-300)] dark:border-white/10 dark:hover:border-white/30",
              )}
            >
              {opt.recommended && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  {modeT.recommendedBadge}
                </span>
              )}
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm transition",
                  active
                    ? "from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white"
                    : "from-[color:var(--color-ink-100)] to-[color:var(--color-ink-50)] text-[color:var(--color-ink-700)] group-hover:from-[#c4b5fd] group-hover:to-[#8b5cf6] group-hover:text-white dark:from-white/[0.06] dark:to-white/[0.02] dark:text-white/70",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-bold text-[color:var(--color-ink-900)] dark:text-white">
                  {opt.title}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-ink-500)] dark:text-white/60">
                  {opt.description}
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-[color:var(--color-ink-600)] dark:text-white/70">
                {opt.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand-500)]" />
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[color:var(--color-brand-200)]/60 bg-[color:var(--color-brand-50)]/60 p-4 text-sm text-[color:var(--color-ink-700)] dark:border-[color:var(--color-brand-400)]/30 dark:bg-[color:var(--color-brand-500)]/10 dark:text-white/80">
        <Sparkles className="mr-1.5 inline-block h-3.5 w-3.5 text-[color:var(--color-brand-600)] dark:text-[color:var(--color-brand-300)]" />
        {modeT.flexibilityNote}
      </div>

      <StepNav current={1} />
    </div>
  );
}
