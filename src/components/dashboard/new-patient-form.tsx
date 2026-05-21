"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import {
  createPatientAction,
  PATIENT_GENDER_OPTIONS,
  type CreatePatientInput,
} from "@/server/actions/patients";

const selectClass =
  "h-10 w-full rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 text-sm text-[color:var(--color-ink-900)] outline-none transition focus:border-[color:var(--color-brand-400)] focus:ring-2 focus:ring-[color:var(--color-brand-200)]/40 disabled:opacity-60";

const GENDER_LABEL: Record<(typeof PATIENT_GENDER_OPTIONS)[number] | "", string> = {
  "": "Sin especificar",
  FEMALE: "Mujer",
  MALE: "Hombre",
};

export function NewPatientForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input: CreatePatientInput = {
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      gender: (String(fd.get("gender") ?? "") || null) as CreatePatientInput["gender"],
      dob: String(fd.get("dob") ?? ""),
      source: String(fd.get("source") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };
    startTransition(async () => {
      const res = await createPatientAction(input);
      if (res.ok) {
        router.push(`/app/clients/${res.data.patientId}`);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" name="firstName" required maxLength={120} disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellidos (opcional)</Label>
          <Input id="lastName" name="lastName" maxLength={120} disabled={pending} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono (E.164)</Label>
          <Input
            id="phone"
            name="phone"
            required
            placeholder="+34611000000"
            maxLength={16}
            disabled={pending}
          />
          <p className="text-xs text-[color:var(--color-ink-500)]">
            Único por clínica. Es el identificador con el que el bot recibe los WhatsApps.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email (opcional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="cliente@example.com"
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="gender">Género</Label>
          <select id="gender" name="gender" className={selectClass} disabled={pending} defaultValue="">
            <option value="">{GENDER_LABEL[""]}</option>
            {PATIENT_GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dob">Fecha de nacimiento (opcional)</Label>
          <Input id="dob" name="dob" type="date" disabled={pending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="source">Cómo nos conoció (opcional)</Label>
        <Input
          id="source"
          name="source"
          placeholder="Ej.: WhatsApp, Instagram, recomendación de Laura..."
          maxLength={60}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas internas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Contexto que la IA debería tener en cuenta."
          disabled={pending}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> Crear paciente
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/app/clients")}
          disabled={pending}
        >
          Cancelar
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
