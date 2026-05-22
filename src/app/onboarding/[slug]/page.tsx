import { notFound } from "next/navigation";
import { getStepBySlug, ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { StepProgress } from "@/components/onboarding/step-progress";
import { StepHeader } from "@/components/onboarding/step-header";

import { StepSector } from "@/components/onboarding/steps/step-sector";
import { StepBusiness } from "@/components/onboarding/steps/step-business";
import { StepLocations } from "@/components/onboarding/steps/step-locations";
import { StepEmployees } from "@/components/onboarding/steps/step-employees";
import { StepServices } from "@/components/onboarding/steps/step-services";
import { StepModules } from "@/components/onboarding/steps/step-modules";
import { StepChannels } from "@/components/onboarding/steps/step-channels";
import { StepAgenda } from "@/components/onboarding/steps/step-agenda";
import { StepAI } from "@/components/onboarding/steps/step-ai";
import { StepLeads } from "@/components/onboarding/steps/step-leads";
import { StepStates } from "@/components/onboarding/steps/step-states";
import { StepCRM } from "@/components/onboarding/steps/step-crm";
import { StepAutomations } from "@/components/onboarding/steps/step-automations";
import { StepReady } from "@/components/onboarding/steps/step-ready";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((s) => ({ slug: s.slug }));
}

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  sector: StepSector,
  negocio: StepBusiness,
  sedes: StepLocations,
  empleados: StepEmployees,
  servicios: StepServices,
  modulos: StepModules,
  canales: StepChannels,
  agenda: StepAgenda,
  ia: StepAI,
  leads: StepLeads,
  estados: StepStates,
  crm: StepCRM,
  automatizaciones: StepAutomations,
  listo: StepReady,
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

  return (
    <div className="flex flex-col gap-8 anim-fade-up">
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-3">
          <Badge variant="brand">
            <Sparkles className="h-3 w-3" /> Configuración paso a paso
          </Badge>
          <h1 className="text-4xl font-black tracking-[-0.02em] md:text-5xl">
            Onboarding{" "}
            <span className="text-brand-gradient">inteligente</span>
          </h1>
          <p className="max-w-2xl text-base text-[color:var(--color-ink-500)]">
            Este proceso está diseñado para que tu negocio quede completamente
            conectado y funcionando en pocos minutos. Puedes saltar pasos y
            volver cuando quieras.
          </p>
        </div>
        <StepProgress current={step.num} />
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white/95 p-7 shadow-[var(--shadow-md)] backdrop-blur md:p-9">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,128,105,0.4) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <StepHeader
            num={step.num}
            title={step.label}
            description={step.description}
          />
          <div className="mt-8">
            <StepComp />
          </div>
        </div>
      </section>
    </div>
  );
}
