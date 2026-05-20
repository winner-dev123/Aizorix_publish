"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { useOnboarding } from "@/lib/store/onboarding-store";

interface StepNavProps {
  current: number;
  canContinue?: boolean;
  nextLabel?: string;
  onBeforeNext?: () => boolean | void;
}

export function StepNav({
  current,
  canContinue = true,
  nextLabel,
  onBeforeNext,
}: StepNavProps) {
  const router = useRouter();
  const setStep = useOnboarding((s) => s.setStep);
  const prev = ONBOARDING_STEPS.find((s) => s.num === current - 1);
  const next = ONBOARDING_STEPS.find((s) => s.num === current + 1);

  const goNext = () => {
    if (onBeforeNext) {
      const ok = onBeforeNext();
      if (ok === false) return;
    }
    if (next) {
      setStep(next.num);
      router.push(`/onboarding/${next.slug}`);
    } else {
      router.push("/app");
    }
  };

  const goPrev = () => {
    if (!prev) return;
    setStep(prev.num);
    router.push(`/onboarding/${prev.slug}`);
  };

  return (
    <div className="mt-2 flex items-center justify-between gap-3 border-t border-[color:var(--color-ink-100)] pt-6">
      <Button
        variant="ghost"
        onClick={goPrev}
        disabled={!prev}
        className="text-[color:var(--color-ink-500)]"
      >
        <ArrowLeft /> Atrás
      </Button>
      <div className="flex items-center gap-3">
        {prev && (
          <span className="hidden text-xs text-[color:var(--color-ink-400)] sm:inline">
            Paso {current} de {ONBOARDING_STEPS.length}
          </span>
        )}
        <Button onClick={goNext} disabled={!canContinue} variant="accent" size="lg">
          {nextLabel ?? (next ? "Continuar" : "Ir al CRM")} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
