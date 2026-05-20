"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
} from "@/server/actions/appointments";

type Props = {
  appointmentId: string;
  /** Current start time in clinic-local form (e.g. "2026-05-26T10:00"). */
  startsAtLocal: string;
};

export function AppointmentControls({ appointmentId, startsAtLocal }: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "reschedule">("idle");
  const [newStart, setNewStart] = useState(startsAtLocal);
  const [error, setError] = useState<string | null>(null);

  function doCancel() {
    setError(null);
    if (!confirm("¿Cancelar esta cita?")) return;
    startTransition(async () => {
      const res = await cancelAppointmentAction(appointmentId);
      if (!res.ok) setError(res.error.message);
    });
  }

  function doReschedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await rescheduleAppointmentAction(appointmentId, newStart);
      if (!res.ok) setError(res.error.message);
      else setMode("idle");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {mode === "idle" ? (
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setMode("reschedule")}
          >
            Mover
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={doCancel}
            className="text-red-600 hover:bg-red-50"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <form onSubmit={doReschedule} className="flex items-center gap-1.5">
          <input
            type="datetime-local"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            step={1800}
            className="rounded-md border border-[color:var(--color-ink-200)] px-2 py-1 text-xs"
          />
          <Button type="submit" size="sm" variant="primary" disabled={pending}>
            Guardar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setMode("idle")}
          >
            ×
          </Button>
        </form>
      )}
      {error && <p className="text-[10px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
