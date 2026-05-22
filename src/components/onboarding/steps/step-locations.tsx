"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding, type Location } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function makeLocation(): Location {
  return {
    id: crypto.randomUUID(),
    name: "",
    address: "",
    phone: "",
    openHour: "09:00",
    closeHour: "20:00",
    weekdays: ["L", "M", "X", "J", "V"],
  };
}

export function StepLocations() {
  const locations = useOnboarding((s) => s.locations);
  const setLocations = useOnboarding((s) => s.setLocations);
  const [draft, setDraft] = useState<Location>(makeLocation);

  const addLocation = () => {
    if (!draft.name.trim()) return;
    setLocations([...locations, draft]);
    setDraft(makeLocation());
  };

  const removeLocation = (id: string) =>
    setLocations(locations.filter((l) => l.id !== id));

  const toggleWeekday = (day: string) => {
    setDraft({
      ...draft,
      weekdays: draft.weekdays.includes(day)
        ? draft.weekdays.filter((d) => d !== day)
        : [...draft.weekdays, day],
    });
  };

  return (
    <div className="flex flex-col gap-7">
      {locations.length > 0 && (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[color:var(--color-ink-900)]">
                  {loc.name}
                </p>
                <p className="truncate text-sm text-[color:var(--color-ink-500)]">
                  {loc.address || "Sin dirección"} · {loc.phone || "Sin teléfono"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-ink-500)]">
                  {loc.openHour} – {loc.closeHour} · {loc.weekdays.join(" ")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLocation(loc.id)}
                aria-label="Eliminar sede"
              >
                <Trash2 className="h-4 w-4 text-[color:var(--color-danger)]" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] p-5">
        <p className="mb-4 text-sm font-semibold text-[color:var(--color-ink-700)]">
          Añadir sede
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Nombre de la sede</Label>
            <Input
              placeholder="Ej. Vanity Center · Madrid"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Teléfono</Label>
            <Input
              placeholder="+34 ..."
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Dirección</Label>
            <Input
              placeholder="Calle, número, ciudad"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Hora apertura</Label>
            <Input
              type="time"
              value={draft.openHour}
              onChange={(e) => setDraft({ ...draft, openHour: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Hora cierre</Label>
            <Input
              type="time"
              value={draft.closeHour}
              onChange={(e) => setDraft({ ...draft, closeHour: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Días que abre</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = draft.weekdays.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleWeekday(d)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      active
                        ? "border-transparent bg-gradient-to-br from-[#25d366] to-[#0d9488] text-[color:var(--color-ink-900)] shadow-[0_4px_10px_-4px_rgba(13,148,136,0.4)]"
                        : "border-[color:var(--color-ink-200)] bg-white text-[color:var(--color-ink-500)] hover:border-[color:var(--color-ink-400)]",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <Button onClick={addLocation} variant="primary" className="mt-5">
          <Plus className="h-4 w-4" /> Añadir sede
        </Button>
      </div>

      <StepNav current={3} canContinue={locations.length > 0} />
    </div>
  );
}
