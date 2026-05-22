"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { updatePatientAction, type UpdatePatientInput } from "@/server/actions/patients";
import { PATIENT_GENDER_OPTIONS } from "@/server/actions/patients-options";

const selectClass =
  "h-10 w-full rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 text-sm text-[color:var(--color-ink-900)] outline-none transition focus:border-[color:var(--color-brand-400)] focus:ring-2 focus:ring-[color:var(--color-brand-200)]/40 disabled:opacity-60";

type Gender = (typeof PATIENT_GENDER_OPTIONS)[number];

const GENDER_LABEL: Record<Gender | "", string> = {
  "": "Sin especificar",
  FEMALE: "Mujer",
  MALE: "Hombre",
};

const STATUS_LABEL: Record<UpdatePatientInput["status"], string> = {
  LEAD: "Lead",
  ACTIVE: "Activo/a",
  INACTIVE: "Inactivo/a",
};

export type EditPatientDefaults = {
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: Gender | "";
  /** YYYY-MM-DD or empty */
  dob: string;
  source: string;
  notes: string;
  status: UpdatePatientInput["status"];
};

export function EditPatientForm({ defaults }: { defaults: EditPatientDefaults }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [phone, setPhone] = useState(defaults.phone);
  const [email, setEmail] = useState(defaults.email);
  const [gender, setGender] = useState<Gender | "">(defaults.gender);
  const [dob, setDob] = useState(defaults.dob);
  const [source, setSource] = useState(defaults.source);
  const [notes, setNotes] = useState(defaults.notes);
  const [status, setStatus] = useState<UpdatePatientInput["status"]>(defaults.status);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const input: UpdatePatientInput = {
      firstName,
      lastName,
      phone,
      email,
      gender: (gender || null) as UpdatePatientInput["gender"],
      dob,
      source,
      notes,
      status,
    };
    startTransition(async () => {
      const res = await updatePatientAction(defaults.patientId, input);
      if (res.ok) {
        setSaved(true);
        // Re-fetch the parent page data so the client detail view reflects the edit.
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
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={120}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={120}
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono (E.164)</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34611000000"
            maxLength={16}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="gender">Género</Label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | "")}
            className={selectClass}
            disabled={pending}
          >
            <option value="">{GENDER_LABEL[""]}</option>
            {PATIENT_GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dob">Fecha de nacimiento</Label>
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UpdatePatientInput["status"])}
            className={selectClass}
            disabled={pending}
          >
            <option value="LEAD">{STATUS_LABEL.LEAD}</option>
            <option value="ACTIVE">{STATUS_LABEL.ACTIVE}</option>
            <option value="INACTIVE">{STATUS_LABEL.INACTIVE}</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="source">Cómo nos conoció</Label>
        <Input
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          maxLength={60}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas internas</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={2000}
          disabled={pending}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> Guardar cambios
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/app/clients/${defaults.patientId}`)}
          disabled={pending}
        >
          Volver a la ficha
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
