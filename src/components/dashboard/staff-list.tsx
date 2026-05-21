"use client";

import { useState, useTransition } from "react";
import { Mail, Plus, RotateCcw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  inviteStaffAction,
  setStaffActiveAction,
  setStaffRoleAction,
  type InviteStaffInput,
} from "@/server/actions/staff";
import { STAFF_ROLE_OPTIONS } from "@/server/actions/staff-options";

type Role = (typeof STAFF_ROLE_OPTIONS)[number];

export type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  createdAt: Date;
};

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Propietario",
  ADMIN: "Admin",
  RECEPTIONIST: "Recepción",
  STAFF: "Personal",
};

const selectClass =
  "h-10 rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 text-sm text-[color:var(--color-ink-900)] outline-none transition focus:border-[color:var(--color-brand-400)] focus:ring-2 focus:ring-[color:var(--color-brand-200)]/40";

export function StaffList({
  initialRows,
  currentUserId,
  currentUserRole,
}: {
  initialRows: StaffRow[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Form state for the "invite" form.
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("STAFF");

  function doInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const input: InviteStaffInput = {
      email: inviteEmail,
      role: inviteRole,
      name: inviteName,
    };
    startTransition(async () => {
      const res = await inviteStaffAction(input);
      if (res.ok) {
        setInfo(`Invitación enviada a ${inviteEmail}. Revisen su email (o la consola en dev).`);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("STAFF");
      } else {
        setError(res.error.message);
      }
    });
  }

  function doToggleActive(row: StaffRow) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await setStaffActiveAction(row.id, !row.active);
      if (!res.ok) setError(res.error.message);
    });
  }

  function doChangeRole(row: StaffRow, role: Role) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await setStaffRoleAction({ userId: row.id, role });
      if (!res.ok) setError(res.error.message);
    });
  }

  // Only an OWNER can mutate OWNER roles. Surface that as disabled-select
  // entries instead of after-the-fact errors.
  const canEditOwnerRoles = currentUserRole === "OWNER";

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <form onSubmit={doInvite} className="rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-5">
        <p className="text-sm font-bold text-[color:var(--color-ink-900)]">Invitar empleado</p>
        <p className="mt-0.5 text-xs text-[color:var(--color-ink-500)]">
          Crea la cuenta y envía un enlace de acceso por email al instante.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
          <div>
            <Label htmlFor="inv-email">Email</Label>
            <Input
              id="inv-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="alguien@clinica.com"
              required
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="inv-name">Nombre (opcional)</Label>
            <Input
              id="inv-name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Laura García"
              maxLength={120}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="inv-role">Rol</Label>
            <select
              id="inv-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className={selectClass + " w-full"}
              disabled={pending}
            >
              {STAFF_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} disabled={r === "OWNER" && !canEditOwnerRoles}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={pending || !inviteEmail}>
              <Plus className="h-4 w-4" /> Enviar
            </Button>
          </div>
        </div>
      </form>

      {/* Staff list */}
      <div className="rounded-2xl border border-[color:var(--color-ink-100)] bg-white">
        {initialRows.length === 0 && (
          <p className="p-6 text-center text-sm text-[color:var(--color-ink-500)]">
            No hay empleados aún.
          </p>
        )}
        <ul className="divide-y divide-[color:var(--color-ink-100)]">
          {initialRows.map((row) => {
            const isSelf = row.id === currentUserId;
            const ownerRoleLocked = row.role === "OWNER" && !canEditOwnerRoles;
            return (
              <li
                key={row.id}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${row.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#bcb1ff] to-[#7c6cf5] text-xs font-black text-white">
                    {(row.name ?? row.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[color:var(--color-ink-900)]">
                      {row.name ?? row.email}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2">
                          Tú
                        </Badge>
                      )}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-[color:var(--color-ink-500)]">
                      <Mail className="h-3 w-3" /> {row.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.role}
                    onChange={(e) => doChangeRole(row, e.target.value as Role)}
                    className={selectClass}
                    disabled={pending || ownerRoleLocked}
                    aria-label={`Rol de ${row.email}`}
                  >
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r} disabled={r === "OWNER" && !canEditOwnerRoles}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>

                  {row.active ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => doToggleActive(row)}
                      disabled={pending || isSelf}
                      title={isSelf ? "No puedes desactivarte a ti mismo" : undefined}
                    >
                      <ShieldOff className="h-4 w-4" /> Desactivar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => doToggleActive(row)}
                      disabled={pending}
                    >
                      <RotateCcw className="h-4 w-4" /> Reactivar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {info && !error && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200/70">
          {info}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
          {error}
        </p>
      )}
    </div>
  );
}
