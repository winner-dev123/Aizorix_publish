"use client";

import { useOnboarding } from "@/lib/store/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StepNav } from "@/components/onboarding/step-nav";

export function StepAgenda() {
  const agenda = useOnboarding((s) => s.agenda);
  const setAgenda = useOnboarding((s) => s.setAgenda);

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label className="mb-1.5 block">Duración de slot (min)</Label>
          <Input
            type="number"
            min={5}
            step={5}
            value={agenda.slotMin}
            onChange={(e) => setAgenda({ slotMin: Number(e.target.value) || 30 })}
          />
          <p className="mt-1 text-xs text-[color:var(--color-ink-500)]">
            Cada cuántos minutos se ofrecen huecos en la agenda.
          </p>
        </div>
        <div>
          <Label className="mb-1.5 block">Buffer entre citas (min)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={agenda.bufferMin}
            onChange={(e) => setAgenda({ bufferMin: Number(e.target.value) || 0 })}
          />
          <p className="mt-1 text-xs text-[color:var(--color-ink-500)]">
            Tiempo de preparación entre una cita y la siguiente.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-5">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Permitir reservas el mismo día</p>
            <p className="text-sm text-[color:var(--color-ink-500)]">
              La IA podrá ofrecer huecos disponibles hoy mismo.
            </p>
          </div>
          <Checkbox
            checked={agenda.allowSameDay}
            onCheckedChange={(v) => setAgenda({ allowSameDay: v })}
          />
        </label>
        <label className="flex items-center justify-between gap-4 border-t border-[color:var(--color-ink-100)] pt-3">
          <div>
            <p className="font-medium">Recordatorios automáticos</p>
            <p className="text-sm text-[color:var(--color-ink-500)]">
              Envía recordatorios 24h y 1h antes vía WhatsApp/Email.
            </p>
          </div>
          <Checkbox
            checked={agenda.reminders}
            onCheckedChange={(v) => setAgenda({ reminders: v })}
          />
        </label>
      </div>

      <StepNav current={8} />
    </div>
  );
}
