"use client";

import { useState, useTransition } from "react";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBusinessHoursAction } from "@/server/actions/clinic";

export type HoursRow = {
  dayOfWeek: number; // 0=Sunday … 6=Saturday
  opensAt: string;
  closesAt: string;
};

// European-week order: Monday → Sunday. Sunday is 0 in the schema.
const DAYS: { dow: number; name: string }[] = [
  { dow: 1, name: "Lunes" },
  { dow: 2, name: "Martes" },
  { dow: 3, name: "Miércoles" },
  { dow: 4, name: "Jueves" },
  { dow: 5, name: "Viernes" },
  { dow: 6, name: "Sábado" },
  { dow: 0, name: "Domingo" },
];

type Window = { opensAt: string; closesAt: string };
type DayState = Record<number, Window[]>;

function groupByDay(rows: HoursRow[]): DayState {
  const out: DayState = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rows) {
    out[r.dayOfWeek]!.push({ opensAt: r.opensAt, closesAt: r.closesAt });
  }
  for (const d of Object.keys(out)) {
    out[Number(d)]!.sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  }
  return out;
}

function flatten(state: DayState): HoursRow[] {
  const out: HoursRow[] = [];
  for (const dow of Object.keys(state)) {
    for (const w of state[Number(dow)]!) {
      out.push({ dayOfWeek: Number(dow), opensAt: w.opensAt, closesAt: w.closesAt });
    }
  }
  return out;
}

export function BusinessHoursForm({ initial }: { initial: HoursRow[] }) {
  const [state, setState] = useState<DayState>(() => groupByDay(initial));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addWindow(dow: number) {
    setState((s) => ({
      ...s,
      [dow]: [...s[dow]!, { opensAt: "09:30", closesAt: "14:00" }],
    }));
  }

  function removeWindow(dow: number, idx: number) {
    setState((s) => ({ ...s, [dow]: s[dow]!.filter((_, i) => i !== idx) }));
  }

  function updateWindow(dow: number, idx: number, field: "opensAt" | "closesAt", value: string) {
    setState((s) => ({
      ...s,
      [dow]: s[dow]!.map((w, i) => (i === idx ? { ...w, [field]: value } : w)),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const rows = flatten(state);
    startTransition(async () => {
      const res = await updateBusinessHoursAction(rows);
      if (res.ok) setSaved(true);
      else setError(res.error.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2.5">
        {DAYS.map(({ dow, name }) => {
          const windows = state[dow] ?? [];
          const closed = windows.length === 0;
          return (
            <div
              key={dow}
              className="rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[color:var(--color-ink-900)]">{name}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addWindow(dow)}
                  disabled={pending}
                >
                  <Plus className="h-4 w-4" /> Añadir franja
                </Button>
              </div>

              {closed ? (
                <p className="mt-2 text-xs text-[color:var(--color-ink-400)]">Cerrado</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {windows.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={w.opensAt}
                        onChange={(e) => updateWindow(dow, i, "opensAt", e.target.value)}
                        className="w-32"
                        disabled={pending}
                      />
                      <span className="text-xs text-[color:var(--color-ink-500)]">a</span>
                      <Input
                        type="time"
                        value={w.closesAt}
                        onChange={(e) => updateWindow(dow, i, "closesAt", e.target.value)}
                        className="w-32"
                        disabled={pending}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeWindow(dow, i)}
                        disabled={pending}
                        aria-label="Quitar franja"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> Guardar horarios
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
