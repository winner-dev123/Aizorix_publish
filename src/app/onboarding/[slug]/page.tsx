import { notFound } from "next/navigation";
import {
  getStepBySlug,
  getStepDictKey,
  ONBOARDING_STEPS,
} from "@/lib/onboarding-steps";
import { getServerT } from "@/i18n/server";
import { StepProgress } from "@/components/onboarding/step-progress";
import { StepHeader } from "@/components/onboarding/step-header";

import { StepCrmMode } from "@/components/onboarding/steps/step-crm-mode";
import { StepBusiness } from "@/components/onboarding/steps/step-business";
import { StepServices } from "@/components/onboarding/steps/step-services";
import { StepChannels } from "@/components/onboarding/steps/step-channels";
import { StepAgenda } from "@/components/onboarding/steps/step-agenda";
import { StepAI } from "@/components/onboarding/steps/step-ai";
import { StepReady } from "@/components/onboarding/steps/step-ready";

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((s) => ({ slug: s.slug }));
}

/**
 * "Servicios y agenda" bundles the treatments list + business hours editor
 * into a single onboarding screen, matching the reference where step 2
 * shows both blocks stacked.
 */
function StepServicesAndAgenda() {
  return (
    <div className="space-y-10">
      <StepServices />
      <div className="border-t border-[color:var(--color-ink-100)] pt-10 dark:border-white/10">
        <StepAgenda />
      </div>
    </div>
  );
}

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  modo: StepCrmMode,
  negocio: StepBusiness,
  "servicios-y-agenda": StepServicesAndAgenda,
  canales: StepChannels,
  ia: StepAI,
  activar: StepReady,
};

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const step = getStepBySlug(slug);
  if (!step) return notFound();

  const StepComp = STEP_COMPONENTS[slug];
  if (!StepComp) return notFound();

  // Resolve the title/description from the active language. The static
  // `step.label` / `step.description` are kept as the canonical Spanish
  // fallback for slugs not present in the dictionary (e.g. legacy steps).
  const { t } = await getServerT();
  const dictKey = getStepDictKey(slug);
  const dictStep = dictKey ? t.onboarding.steps[dictKey] : null;
  const label = dictStep?.label ?? step.label;
  const highlight = dictStep?.highlight ?? step.highlight;
  const description = dictStep?.description ?? step.description;

  return (
    <div className="flex flex-col gap-8 anim-fade-up">
      <StepProgress current={step.num} />

      <StepHeader
        num={step.num}
        title={label}
        highlight={highlight}
        description={description}
        eyebrow={t.onboarding.eyebrow}
      />

      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white/95 p-7 shadow-[var(--shadow-md)] backdrop-blur md:p-9 dark:border-white/10 dark:bg-[color:var(--color-surface-1)]/85">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.40) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <StepComp />
        </div>
      </section>
    </div>
  );
}
