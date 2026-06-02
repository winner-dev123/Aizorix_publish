"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  deletePatientAsAdminAction,
  deleteTechnicianAsAdminAction,
} from "@/server/actions/admin";

/**
 * One-click-with-confirm delete button used in the admin tables.
 * Co-located here so the cross-clinic delete is impossible to invoke
 * accidentally: it lives in /components/admin only and posts to the
 * matching admin server action.
 */
export function RowDeleteButton({
  kind,
  id,
  label,
}: {
  kind: "patient" | "technician";
  id: string;
  /** Used in the confirm prompt: "Eliminar a {label}?" */
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    if (
      !window.confirm(
        `¿Eliminar ${kind === "patient" ? "al paciente" : "al técnico"} «${label}»? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const res =
      kind === "patient"
        ? await deletePatientAsAdminAction(id)
        : await deleteTechnicianAsAdminAction(id);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-[10px] text-rose-300" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Eliminar ${label}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
