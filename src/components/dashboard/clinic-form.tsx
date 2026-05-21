"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClinicAction, type UpdateClinicInput } from "@/server/actions/clinic";
import {
  CLINIC_LOCALE_OPTIONS,
  CLINIC_TIMEZONE_OPTIONS,
} from "@/server/actions/clinic-options";

export type ClinicFormDefaults = {
  name: string;
  timezone: string;
  locale: string;
  whatsappNumber: string | null;
  minLeadMinutes: number;
  slotGranularityMin: number;
};

const selectClass =
  "h-10 rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 text-sm text-[color:var(--color-ink-900)] outline-none transition focus:border-[color:var(--color-brand-400)] focus:ring-2 focus:ring-[color:var(--color-brand-200)]/40";

export function ClinicForm({ defaults }: { defaults: ClinicFormDefaults }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const form = e.currentTarget;
    const data = new FormData(form);

    const input: UpdateClinicInput = {
      name: String(data.get("name") ?? ""),
      timezone: data.get("timezone") as UpdateClinicInput["timezone"],
      locale: data.get("locale") as UpdateClinicInput["locale"],
      whatsappNumber: String(data.get("whatsappNumber") ?? ""),
      minLeadMinutes: Number(data.get("minLeadMinutes") ?? 0),
      slotGranularityMin: Number(data.get("slotGranularityMin") ?? 30),
    };

    startTransition(async () => {
      const res = await updateClinicAction(input);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field id="name" label="Nombre de la clínica">
        <Input id="name" name="name" defaultValue={defaults.name} maxLength={120} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="timezone" label="Zona horaria">
          <select
            id="timezone"
            name="timezone"
            defaultValue={defaults.timezone}
            className={selectClass}
          >
            {CLINIC_TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
        <Field id="locale" label="Idioma">
          <select id="locale" name="locale" defaultValue={defaults.locale} className={selectClass}>
            {CLINIC_LOCALE_OPTIONS.map((lc) => (
              <option key={lc} value={lc}>
                {lc}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="whatsappNumber"
        label="Número de WhatsApp (E.164)"
        hint="Formato +<código país><número>. Déjalo vacío si aún no está conectado."
      >
        <Input
          id="whatsappNumber"
          name="whatsappNumber"
          defaultValue={defaults.whatsappNumber ?? ""}
          placeholder="+34911000000"
          maxLength={16}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="minLeadMinutes"
          label="Tiempo mínimo antes de una cita (min)"
          hint="La IA no propondrá huecos con menos antelación."
        >
          <Input
            id="minLeadMinutes"
            name="minLeadMinutes"
            type="number"
            min={0}
            max={10080}
            step={15}
            defaultValue={defaults.minLeadMinutes}
            required
          />
        </Field>
        <Field
          id="slotGranularityMin"
          label="Tamaño del hueco (min)"
          hint="30 min es lo más habitual."
        >
          <Input
            id="slotGranularityMin"
            name="slotGranularityMin"
            type="number"
            min={5}
            max={120}
            step={5}
            defaultValue={defaults.slotGranularityMin}
            required
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> Guardar cambios
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

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-[color:var(--color-ink-500)]">{hint}</p>}
    </div>
  );
}
