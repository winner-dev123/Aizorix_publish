"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding, type Service } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";
import { formatEUR } from "@/lib/utils";

function newService(): Service {
  return {
    id: crypto.randomUUID(),
    name: "",
    durationMin: 45,
    price: 0,
    category: "",
    gender: "all",
  };
}

export function StepServices() {
  const services = useOnboarding((s) => s.services);
  const setServices = useOnboarding((s) => s.setServices);
  const [draft, setDraft] = useState<Service>(newService);

  const add = () => {
    if (!draft.name.trim() || draft.price < 0 || draft.durationMin <= 0) return;
    setServices([...services, draft]);
    setDraft(newService());
  };
  const remove = (id: string) => setServices(services.filter((s) => s.id !== id));

  return (
    <div className="flex flex-col gap-7">
      {services.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[color:var(--color-ink-100)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-ink-50)] text-left text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">
              <tr>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Público</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-[color:var(--color-ink-100)]">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-500)]">
                    {s.category || "—"}
                  </td>
                  <td className="px-4 py-3">{s.durationMin} min</td>
                  <td className="px-4 py-3 font-semibold">{formatEUR(s.price)}</td>
                  <td className="px-4 py-3 capitalize text-[color:var(--color-ink-500)]">
                    {s.gender === "all"
                      ? "Todos"
                      : s.gender === "men"
                        ? "Hombres"
                        : "Mujeres"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 text-[color:var(--color-danger)]" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] p-5">
        <p className="mb-4 text-sm font-semibold text-[color:var(--color-ink-700)]">
          Añadir servicio
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Nombre del tratamiento *</Label>
            <Input
              placeholder="Ej. Dermapen"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Categoría</Label>
            <Input
              placeholder="Facial, corporal, etc."
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Duración (min)</Label>
            <Input
              type="number"
              min={5}
              step={5}
              value={draft.durationMin}
              onChange={(e) =>
                setDraft({ ...draft, durationMin: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Precio (€)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={draft.price}
              onChange={(e) =>
                setDraft({ ...draft, price: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Público</Label>
            <select
              className="h-10 w-full rounded-md border border-[color:var(--color-ink-200)] bg-white px-3 text-sm"
              value={draft.gender}
              onChange={(e) =>
                setDraft({ ...draft, gender: e.target.value as Service["gender"] })
              }
            >
              <option value="all">Todos</option>
              <option value="men">Solo hombres</option>
              <option value="women">Solo mujeres</option>
            </select>
          </div>
        </div>
        <Button onClick={add} variant="primary" className="mt-5">
          <Plus className="h-4 w-4" /> Añadir servicio
        </Button>
      </div>

      <StepNav current={5} canContinue={true} />
    </div>
  );
}
