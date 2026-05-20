"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";

export function StepStates() {
  const leadStates = useOnboarding((s) => s.leadStates);
  const setLeadStates = useOnboarding((s) => s.setLeadStates);
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || leadStates.includes(trimmed)) return;
    setLeadStates([...leadStates, trimmed]);
    setDraft("");
  };
  const remove = (name: string) =>
    setLeadStates(leadStates.filter((s) => s !== name));

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2">
        {leadStates.map((s) => (
          <div
            key={s}
            className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink-100)] bg-white p-3"
          >
            <GripVertical className="h-4 w-4 text-[color:var(--color-ink-300)]" />
            <span className="flex-1 font-medium">{s}</span>
            <Button variant="ghost" size="icon" onClick={() => remove(s)}>
              <Trash2 className="h-4 w-4 text-[color:var(--color-danger)]" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ej. Esperando confirmación"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add} variant="primary">
          <Plus className="h-4 w-4" /> Añadir estado
        </Button>
      </div>

      <p className="text-xs text-[color:var(--color-ink-500)]">
        Cada estado se mostrará como una columna del Kanban de tu pipeline.
      </p>

      <StepNav current={11} canContinue={leadStates.length >= 2} />
    </div>
  );
}
