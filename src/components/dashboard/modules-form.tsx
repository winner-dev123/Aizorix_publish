"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateActiveModulesAction } from "@/server/actions/clinic";
import {
  MODULE_CATALOGUE,
  type ModuleKey,
} from "@/server/actions/module-catalogue";

export function ModulesForm({ initial }: { initial: ModuleKey[] }) {
  const [selected, setSelected] = useState<Set<ModuleKey>>(() => new Set(initial));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(() => {
    if (selected.size !== initial.length) return true;
    for (const k of initial) if (!selected.has(k)) return true;
    return false;
  }, [selected, initial]);

  function toggle(key: ModuleKey) {
    setSaved(false);
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateActiveModulesAction(Array.from(selected));
      if (res.ok) setSaved(true);
      else setError(res.error.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODULE_CATALOGUE.map((mod) => {
          const active = selected.has(mod.key);
          return (
            <label
              key={mod.key}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                active
                  ? "border-[color:var(--color-brand-300)] bg-[color:var(--color-brand-50)]/70 ring-2 ring-[color:var(--color-brand-200)]/60"
                  : "border-[color:var(--color-ink-100)] bg-white hover:border-[color:var(--color-ink-200)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[color:var(--color-ink-900)]">{mod.name}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-ink-600)]">
                    {mod.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(mod.key)}
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-[color:var(--color-brand-500)]"
                  aria-label={`Activar ${mod.name}`}
                />
              </div>
              {active && (
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
                  <CheckCircle2 className="h-3 w-3" /> Activo
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending || !dirty}>
          <Save className="h-4 w-4" /> Guardar módulos
        </Button>
        {saved && !error && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
            Guardado · {selected.size}
            {selected.size === 1 ? " módulo activo" : " módulos activos"}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          {error}
        </p>
      )}

      <p className="text-xs text-[color:var(--color-ink-500)]">
        Al desactivar un módulo, su entrada desaparece de la barra lateral en la próxima
        navegación. Las URLs siguen accesibles directamente — si quieres bloquear el acceso
        completamente, dilo y añadimos una redirección por ruta.
      </p>
    </form>
  );
}
