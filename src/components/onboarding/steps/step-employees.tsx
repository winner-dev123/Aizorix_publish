"use client";

import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding, type Employee } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";

function newEmployee(): Employee {
  return { id: crypto.randomUUID(), name: "", role: "", email: "", services: [] };
}

export function StepEmployees() {
  const employees = useOnboarding((s) => s.employees);
  const setEmployees = useOnboarding((s) => s.setEmployees);
  const [draft, setDraft] = useState<Employee>(newEmployee);

  const add = () => {
    if (!draft.name.trim()) return;
    setEmployees([...employees, draft]);
    setDraft(newEmployee());
  };
  const remove = (id: string) => setEmployees(employees.filter((e) => e.id !== id));

  return (
    <div className="flex flex-col gap-7">
      {employees.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {employees.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#25d366] to-[#0d9488] text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(13,148,136,0.4)]">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-[color:var(--color-ink-500)]">
                    {e.role || "Sin rol"} {e.email && `· ${e.email}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                <Trash2 className="h-4 w-4 text-[color:var(--color-danger)]" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] p-5">
        <p className="mb-4 text-sm font-semibold text-[color:var(--color-ink-700)]">
          Añadir empleado
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-1.5 block">Nombre</Label>
            <Input
              placeholder="Ej. Laura Martínez"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Rol / Especialidad</Label>
            <Input
              placeholder="Ej. Esteticista"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Email (opcional)</Label>
            <Input
              type="email"
              placeholder="laura@..."
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={add} variant="primary" className="mt-5">
          <Plus className="h-4 w-4" /> Añadir empleado
        </Button>
      </div>

      <StepNav current={4} canContinue={true} />
    </div>
  );
}
