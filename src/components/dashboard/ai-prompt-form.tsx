"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, FileCode2, RotateCcw, Save, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import {
  DEFAULT_PROMPT_TEMPLATE,
  PROMPT_PLACEHOLDERS,
  renderPromptTemplate,
} from "@/server/ai/prompt";
import { updatePromptTemplateAction } from "@/server/actions/clinic";

const MAX_PROMPT_CHARS = 16_000;

const SAMPLE_VARS: Record<string, string> = {
  clinic_name: "Bellem Madrid",
  timezone: "Europe/Madrid",
  now: new Date().toISOString(),
  tone_instructions: "Usa un tono cercano pero profesional. Evita los emojis.",
  guidance_block:
    "\n\nINSTRUCCIONES ADICIONALES DE LA CLÍNICA\nLos martes -20% en limpieza facial.",
  patient_context:
    "Paciente identificado: Lola (id=pat_demo, tel=+34611000000).",
  memory_block: "  - preferred_technician = Diana\n  - allergic_to = lidocaína",
  patient_notes_block:
    "\nNotas internas del equipo (no las cites textualmente al paciente, úsalas para informar tus respuestas):\n  Siempre con Diana.",
};

export type AiPromptFormProps = {
  /** Current persisted override, or null when the clinic is using the default. */
  defaultPrompt: string | null;
};

export function AiPromptForm({ defaultPrompt }: AiPromptFormProps) {
  const isUsingDefault = defaultPrompt === null;
  const [template, setTemplate] = useState<string>(
    defaultPrompt ?? DEFAULT_PROMPT_TEMPLATE,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<"saved" | "reset" | null>(null);

  const trimmed = template.trim();
  const overLimit = template.length > MAX_PROMPT_CHARS;
  const isDirty = (defaultPrompt ?? "") !== trimmed;
  const matchesDefault = trimmed === DEFAULT_PROMPT_TEMPLATE.trim();

  const preview = useMemo(
    () => renderPromptTemplate(template, SAMPLE_VARS),
    [template],
  );

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (overLimit) return;
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      // If the textarea matches the baked-in default, store NULL — it lets us
      // pick up future changes to the default without the clinic stuck on
      // their copy of an old version.
      const payload = matchesDefault ? null : trimmed === "" ? null : trimmed;
      const res = await updatePromptTemplateAction({ template: payload });
      if (res.ok) setSavedAt(payload === null ? "reset" : "saved");
      else setError(res.error.message);
    });
  }

  function onResetToDefault() {
    setTemplate(DEFAULT_PROMPT_TEMPLATE);
    setError(null);
    setSavedAt(null);
  }

  function insertPlaceholder(key: string) {
    setTemplate((prev) => `${prev}{{${key}}}`);
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)]/60 px-4 py-3 text-xs">
        <FileCode2 className="h-4 w-4 text-[color:var(--color-brand-700)]" />
        <span className="font-semibold text-[color:var(--color-ink-700)]">
          Estado actual:
        </span>
        {isUsingDefault ? (
          <span className="rounded-full bg-white px-2 py-0.5 font-medium text-[color:var(--color-ink-600)] ring-1 ring-[color:var(--color-ink-200)]">
            usando plantilla por defecto
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200/70">
            plantilla personalizada activa ({defaultPrompt?.length ?? 0} chars)
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="aiSystemPrompt">Plantilla del prompt</Label>
          <span
            className={`text-xs ${
              overLimit
                ? "font-bold text-red-600"
                : "text-[color:var(--color-ink-500)]"
            }`}
          >
            {template.length.toLocaleString("es-ES")} / {MAX_PROMPT_CHARS.toLocaleString("es-ES")}
          </span>
        </div>
        <Textarea
          id="aiSystemPrompt"
          name="aiSystemPrompt"
          rows={20}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          disabled={pending}
          spellCheck={false}
          className="font-mono text-[12.5px] leading-relaxed"
        />
        <p className="text-xs text-[color:var(--color-ink-500)]">
          Las variables {"{{clinic_name}}"}, {"{{timezone}}"}, etc. se sustituyen
          automáticamente en cada mensaje. Cualquier variable que no exista se
          deja literal — útil si quieres usar llaves dobles en el texto.
        </p>
      </div>

      <details className="rounded-2xl border border-[color:var(--color-ink-100)] bg-white">
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[color:var(--color-ink-900)] hover:bg-[color:var(--color-ink-50)]">
          <span className="flex items-center gap-2">
            <Variable className="h-4 w-4 text-[color:var(--color-brand-700)]" />
            Variables disponibles
          </span>
          <span className="text-xs font-medium text-[color:var(--color-ink-500)]">
            {PROMPT_PLACEHOLDERS.length} disponibles · click para insertar
          </span>
        </summary>
        <div className="border-t border-[color:var(--color-ink-100)] p-4">
          <ul className="space-y-2 text-sm">
            {PROMPT_PLACEHOLDERS.map((p) => (
              <li
                key={p.key}
                className="flex flex-col gap-1 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <button
                  type="button"
                  onClick={() => insertPlaceholder(p.key)}
                  disabled={pending}
                  className="self-start rounded-md bg-[color:var(--color-ink-900)] px-2 py-1 font-mono text-[11px] font-bold text-[color:var(--color-brand-400)] transition hover:bg-[color:var(--color-ink-800)] disabled:opacity-50"
                >
                  {`{{${p.key}}}`}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[color:var(--color-ink-900)]">
                    {p.label}
                  </p>
                  <p className="truncate font-mono text-[11px] text-[color:var(--color-ink-500)]">
                    ej. {p.example.replace(/\n/g, "⏎").slice(0, 80)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details
        className="rounded-2xl border border-[color:var(--color-ink-100)] bg-white"
        open={showPreview}
        onToggle={(e) => setShowPreview((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[color:var(--color-ink-900)] hover:bg-[color:var(--color-ink-50)]">
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[color:var(--color-brand-700)]" />
            Vista previa con datos de ejemplo
          </span>
          <span className="text-xs font-medium text-[color:var(--color-ink-500)]">
            {preview.length.toLocaleString("es-ES")} chars renderizados
          </span>
        </summary>
        <div className="border-t border-[color:var(--color-ink-100)] p-4">
          <pre className="max-h-[400px] overflow-auto rounded-xl bg-[color:var(--color-ink-50)] p-4 font-mono text-[11.5px] leading-relaxed text-[color:var(--color-ink-700)]">
            {preview}
          </pre>
          <p className="mt-2 text-[11px] text-[color:var(--color-ink-500)]">
            Esta vista usa datos ficticios. En producción, las variables se
            sustituyen con datos reales del paciente y de la clínica en cada
            mensaje.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || overLimit || !isDirty}
        >
          <Save className="h-4 w-4" /> Guardar plantilla
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onResetToDefault}
          disabled={pending || matchesDefault}
        >
          <RotateCcw className="h-4 w-4" /> Restaurar valores por defecto
        </Button>
        {savedAt === "saved" && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
            Guardado · se aplica al siguiente mensaje
          </span>
        )}
        {savedAt === "reset" && (
          <span className="rounded-full bg-[color:var(--color-ink-100)] px-3 py-1 text-xs font-semibold text-[color:var(--color-ink-700)] ring-1 ring-[color:var(--color-ink-200)]">
            Restablecido a la plantilla por defecto
          </span>
        )}
      </div>

      {overLimit && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          La plantilla supera el máximo de {MAX_PROMPT_CHARS.toLocaleString("es-ES")} caracteres.
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          {error}
        </p>
      )}
    </form>
  );
}
