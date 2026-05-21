"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertMemoryAction, deleteMemoryAction } from "@/server/actions/memories";

export type MemoryRow = {
  key: string;
  value: string;
  updatedAt: string; // ISO string from server
};

export function MemoriesEditor({
  patientId,
  initial,
  tzFormatted,
}: {
  patientId: string;
  initial: MemoryRow[];
  /** Pre-formatted "dd/MM/yyyy HH:mm" string per row, keyed by row key. */
  tzFormatted: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  // Editing state per row.key — null when not editing any row.
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);

  function addOrUpdate(key: string, value: string) {
    setError(null);
    startTransition(async () => {
      const res = await upsertMemoryAction({ patientId, key, value });
      if (res.ok) {
        setNewKey("");
        setNewValue("");
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  function remove(key: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteMemoryAction({ patientId, key });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {initial.map((m) => {
          const isEditing = editing?.key === m.key;
          return (
            <li
              key={m.key}
              className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--color-ink-500)]">
                  {m.key}
                </p>
                {isEditing ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={editing.value}
                      onChange={(e) => setEditing({ key: m.key, value: e.target.value })}
                      maxLength={500}
                      disabled={pending}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => addOrUpdate(m.key, editing.value)}
                      disabled={pending || !editing.value.trim()}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                      disabled={pending}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing({ key: m.key, value: m.value })}
                    className="mt-0.5 block w-full cursor-text rounded text-left text-sm font-semibold text-[color:var(--color-ink-900)] hover:underline"
                    title="Click para editar"
                  >
                    {m.value}
                  </button>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] text-[color:var(--color-ink-400)]">
                  {tzFormatted[m.key] ?? ""}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(m.key)}
                  disabled={pending}
                  aria-label={`Borrar memoria ${m.key}`}
                  title="Borrar"
                >
                  <Trash2 className="h-4 w-4 text-[color:var(--color-ink-500)]" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Add-new row */}
      <div className="rounded-xl border border-dashed border-[color:var(--color-ink-200)] bg-white/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
          Añadir memoria
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="clave_snake_case"
            maxLength={64}
            disabled={pending}
            className="h-9 flex-1 min-w-[140px] font-mono text-xs"
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="valor breve…"
            maxLength={500}
            disabled={pending}
            className="h-9 flex-[2] min-w-[180px] text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => addOrUpdate(newKey, newValue)}
            disabled={pending || !newKey.trim() || !newValue.trim()}
          >
            <Plus className="h-4 w-4" /> Añadir
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-[color:var(--color-ink-500)]">
          Ej: <code className="font-mono">preferred_technician</code> = <em>Diana</em>,{" "}
          <code className="font-mono">allergic_to</code> = <em>lidocaína</em>. La IA reutiliza
          estas memorias en futuros mensajes.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          {error}
        </p>
      )}
    </div>
  );
}
