"use client";

import { useState, useTransition } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { updatePatientNotesAction } from "@/server/actions/appointments";

const MAX_LENGTH = 2000;

export function PatientNotesEditor({
  patientId,
  initial,
}: {
  patientId: string;
  initial: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local "what's saved" mirror — lets us revert to initial on cancel and
  // re-show updated text after save without forcing a hard refresh.
  const [savedValue, setSavedValue] = useState(initial ?? "");

  function startEdit() {
    setValue(savedValue);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setValue(savedValue);
    setError(null);
    setEditing(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updatePatientNotesAction(patientId, value);
      if (res.ok) {
        setSavedValue(value.trim());
        setEditing(false);
      } else {
        setError(res.error.message);
      }
    });
  }

  // Read mode: show the current saved notes (if any) + an "Editar" button.
  if (!editing) {
    return (
      <div className="space-y-3">
        {savedValue ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--color-ink-700)]">
            {savedValue}
          </p>
        ) : (
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Sin notas todavía. Añade contexto que la IA no captura por sí sola.
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={startEdit}>
          {savedValue ? "Editar notas" : "Añadir notas"}
        </Button>
      </div>
    );
  }

  // Edit mode: textarea + save/cancel buttons.
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        maxLength={MAX_LENGTH}
        disabled={pending}
        placeholder="Ej.: Viene siempre con su madre. Prefiere Diana. Alérgica a la lidocaína."
      />
      <p className="flex justify-between text-xs text-[color:var(--color-ink-500)]">
        <span>
          Visibles para el equipo y para la IA — las usa como contexto para responder, sin
          citarlas literalmente al paciente.
        </span>
        <span>
          {value.length} / {MAX_LENGTH}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          <Save className="h-4 w-4" /> Guardar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={pending}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          {error}
        </p>
      )}
    </form>
  );
}
