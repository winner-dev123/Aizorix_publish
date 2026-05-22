"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import {
  createAppointmentAction,
  type CreateAppointmentInput,
} from "@/server/actions/appointments";

export type PatientOption = { id: string; label: string; phone: string };
export type TreatmentOption = { id: string; name: string; durationMinutes: number };
export type TechnicianOption = { id: string; name: string };

const selectClass =
  "h-10 w-full rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 text-sm text-[color:var(--color-ink-900)] outline-none transition focus:border-[color:var(--color-brand-400)] focus:ring-2 focus:ring-[color:var(--color-brand-200)]/40 disabled:opacity-60";

export function NewAppointmentForm({
  patients,
  treatments,
  technicians,
  /** Browser-local "now" rounded up to the next slot, used as the input's min value. */
  minStartsAtLocal,
  /** Optional prefill (e.g. when arriving from a patient's profile via ?patientId=…). */
  defaultPatientId,
}: {
  patients: PatientOption[];
  treatments: TreatmentOption[];
  technicians: TechnicianOption[];
  minStartsAtLocal: string;
  defaultPatientId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Honor defaultPatientId only when it matches a row in the picker — the
  // server already validates clinic scope, but this avoids selecting a
  // non-existent option client-side.
  const initialPatientId =
    defaultPatientId && patients.some((p) => p.id === defaultPatientId)
      ? defaultPatientId
      : patients[0]?.id ?? "";
  const [patientId, setPatientId] = useState<string>(initialPatientId);
  const [treatmentId, setTreatmentId] = useState<string>(treatments[0]?.id ?? "");
  const [technicianId, setTechnicianId] = useState<string>(technicians[0]?.id ?? "");
  const [startsAtLocal, setStartsAtLocal] = useState<string>(minStartsAtLocal);
  const [notes, setNotes] = useState("");
  const [bypassLeadTime, setBypassLeadTime] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: CreateAppointmentInput = {
      patientId,
      treatmentId,
      technicianId,
      startsAtLocal,
      notes,
      bypassLeadTime,
    };
    startTransition(async () => {
      const res = await createAppointmentAction(input);
      if (res.ok) {
        router.push("/app/agenda");
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="patient">Paciente</Label>
        <select
          id="patient"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className={selectClass}
          disabled={pending || patients.length === 0}
          required
        >
          {patients.length === 0 && <option value="">No hay pacientes registrados</option>}
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} · {p.phone}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="treatment">Tratamiento</Label>
          <select
            id="treatment"
            value={treatmentId}
            onChange={(e) => setTreatmentId(e.target.value)}
            className={selectClass}
            disabled={pending}
            required
          >
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="technician">Técnico/a</Label>
          <select
            id="technician"
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className={selectClass}
            disabled={pending}
            required
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="startsAt">Fecha y hora</Label>
        <Input
          id="startsAt"
          type="datetime-local"
          value={startsAtLocal}
          onChange={(e) => setStartsAtLocal(e.target.value)}
          min={minStartsAtLocal}
          step={60 * 15}
          disabled={pending}
          required
        />
        <p className="text-xs text-[color:var(--color-ink-500)]">
          Hora local de la clínica. Se valida contra los horarios de apertura.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
          placeholder="Ej.: viene con su madre, alérgica a..."
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-[color:var(--color-ink-700)]">
        <input
          type="checkbox"
          checked={bypassLeadTime}
          onChange={(e) => setBypassLeadTime(e.target.checked)}
          disabled={pending}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-[color:var(--color-brand-500)]"
        />
        <span>
          Ignorar tiempo mínimo de antelación. Útil para walk-ins; no recomendado en general.
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> Crear cita
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/app/agenda")}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          <Sparkles className="-mt-0.5 mr-1 inline-block h-3 w-3 text-red-500" />
          {error}
        </p>
      )}
    </form>
  );
}
