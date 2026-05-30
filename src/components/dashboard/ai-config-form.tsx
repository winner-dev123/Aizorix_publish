"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { updateAiConfigAction, type AiConfigInput } from "@/server/actions/clinic";

type Tone = AiConfigInput["aiTone"];

const TONE_OPTIONS: { id: Tone; label: string; example: string }[] = [
  {
    id: "FORMAL",
    label: "Formal · trato de usted",
    example: "Buenos días, ¿en qué puedo ayudarle?",
  },
  {
    id: "CASUAL",
    label: "Cercano · trato de tú",
    example: "¡Hola! Cuéntame, ¿qué necesitas?",
  },
  {
    id: "NEUTRAL",
    label: "Neutro · cercano pero profesional",
    example: "Hola, ¿cómo puedo ayudarte?",
  },
];

export type AiConfigDefaults = {
  aiTone: Tone;
  aiGuidance: string | null;
};

export function AiConfigForm({ defaults }: { defaults: AiConfigDefaults }) {
  const [tone, setTone] = useState<Tone>(defaults.aiTone);
  const [guidance, setGuidance] = useState(defaults.aiGuidance ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateAiConfigAction({ aiTone: tone, aiGuidance: guidance });
      if (res.ok) setSaved(true);
      else setError(res.error.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <Label>Tono del bot</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {TONE_OPTIONS.map((opt) => {
            const active = opt.id === tone;
            return (
              <label
                key={opt.id}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  active
                    ? "border-[color:var(--color-brand-300)] bg-[color:var(--color-brand-50)]/70 ring-2 ring-[color:var(--color-brand-200)]/60 dark:bg-[color:var(--color-brand-500)]/15 dark:border-[color:var(--color-brand-400)]/50 dark:ring-[color:var(--color-brand-400)]/25"
                    : "border-[color:var(--color-ink-100)] bg-white hover:border-[color:var(--color-ink-200)] dark:border-white/10 dark:bg-[color:var(--color-surface-1)] dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="aiTone"
                  value={opt.id}
                  checked={active}
                  onChange={() => setTone(opt.id)}
                  className="sr-only"
                  disabled={pending}
                />
                <p className="text-sm font-bold text-[color:var(--color-ink-900)]">{opt.label}</p>
                <p className="mt-2 text-xs italic text-[color:var(--color-ink-500)]">
                  “{opt.example}”
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="aiGuidance">Instrucciones adicionales para el bot</Label>
        <Textarea
          id="aiGuidance"
          name="aiGuidance"
          rows={6}
          maxLength={2000}
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          disabled={pending}
          placeholder="Ej.: Los martes ofrecemos -20% en limpieza facial. No reserves citas dentro de las próximas 24 horas. Si preguntan por aparcamiento, indica que está en la calle Mayor 12."
        />
        <p className="flex justify-between text-xs text-[color:var(--color-ink-500)]">
          <span>
            Se añade al final del prompt como bloque “Instrucciones adicionales de la clínica”.
          </span>
          <span>{guidance.length} / 2000</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> Guardar configuración
        </Button>
        {saved && !error && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
            Guardado
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          {error}
        </p>
      )}
    </form>
  );
}
