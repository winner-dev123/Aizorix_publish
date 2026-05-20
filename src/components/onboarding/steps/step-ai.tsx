"use client";

import { Bot } from "lucide-react";
import { useOnboarding } from "@/lib/store/onboarding-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StepNav } from "@/components/onboarding/step-nav";
import { cn } from "@/lib/utils";

const TONES = [
  { id: "professional", name: "Profesional", desc: "Educada, directa, técnica." },
  { id: "friendly", name: "Cercana", desc: "Cálida, empática, conversacional." },
  { id: "casual", name: "Casual", desc: "Relajada, juvenil, informal." },
] as const;

export function StepAI() {
  const ai = useOnboarding((s) => s.ai);
  const setAI = useOnboarding((s) => s.setAI);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Label className="mb-2 block">Tono de la IA</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAI({ tone: t.id })}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all",
                ai.tone === t.id
                  ? "border-[color:var(--color-ink-900)] bg-[color:var(--color-ink-50)]"
                  : "border-[color:var(--color-ink-100)] hover:border-[color:var(--color-ink-300)]",
              )}
            >
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-[color:var(--color-ink-500)]">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">Mensaje de bienvenida</Label>
        <Textarea
          rows={3}
          value={ai.introMessage}
          onChange={(e) => setAI({ introMessage: e.target.value })}
        />
        <p className="mt-1 text-xs text-[color:var(--color-ink-500)]">
          Primer mensaje que enviará la IA cuando un cliente inicie una conversación.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-5">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Pedir email a clientes nuevos</p>
            <p className="text-sm text-[color:var(--color-ink-500)]">
              La IA pedirá nombre, teléfono y email en el primer contacto.
            </p>
          </div>
          <Checkbox
            checked={ai.askEmailForNew}
            onCheckedChange={(v) => setAI({ askEmailForNew: v })}
          />
        </label>
        <label className="flex items-center justify-between gap-4 border-t border-[color:var(--color-ink-100)] pt-3">
          <div>
            <p className="font-medium">Empujar siempre hacia la reserva</p>
            <p className="text-sm text-[color:var(--color-ink-500)]">
              La IA propondrá huecos reales y cerrará cita de forma natural.
            </p>
          </div>
          <Checkbox
            checked={ai.pushBooking}
            onCheckedChange={(v) => setAI({ pushBooking: v })}
          />
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-brand-200)] bg-[color:var(--color-brand-50)] p-4">
        <Bot className="mt-0.5 h-5 w-5 text-[color:var(--color-brand-700)]" />
        <p className="text-sm text-[color:var(--color-ink-700)]">
          La IA se entrenará automáticamente con tus servicios, horarios y precios.
          Podrás afinar el comportamiento desde la sección{" "}
          <strong>Configuración &gt; IA</strong> del CRM.
        </p>
      </div>

      <StepNav current={9} />
    </div>
  );
}
