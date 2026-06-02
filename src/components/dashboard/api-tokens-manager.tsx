"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createApiTokenAction,
  revokeApiTokenAction,
} from "@/server/actions/api-tokens";

export interface ApiTokenRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

/**
 * Self-service API token management for clinic OWNER/ADMIN.
 *
 * Two key safety affordances:
 *
 *   - The raw token is shown EXACTLY ONCE, in a modal-like reveal panel
 *     that the user has to acknowledge ("I've saved it") before it
 *     disappears. We don't keep it in memory or send it to a log.
 *   - Every revoke uses `window.confirm()` because there is no undo —
 *     deleting the row invalidates the token instantly across all
 *     external clients using it.
 */
export function ApiTokensManager({ tokens }: { tokens: ApiTokenRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [expiresInDays, setExpiresInDays] = React.useState(90);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [justCreated, setJustCreated] = React.useState<{
    raw: string;
    prefix: string;
    expiresAt: string | null;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Snapshot "now" once on mount via the useState initialiser (runs
  // exactly once on first render) so the "expired" badge below doesn't
  // call the impure `Date.now()` on every re-render.
  const [nowAtMount] = React.useState(() => Date.now());

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await createApiTokenAction({ name, expiresInDays });
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setJustCreated({
      raw: res.data.raw,
      prefix: res.data.prefix,
      expiresAt: res.data.expiresAt,
    });
    setName("");
    setExpiresInDays(90);
    setCreating(false);
    router.refresh();
  }

  async function onRevoke(t: ApiTokenRow) {
    if (
      !window.confirm(
        `¿Revocar el token «${t.name}»? Cualquier integración que lo use dejará de funcionar inmediatamente.`,
      )
    ) {
      return;
    }
    const res = await revokeApiTokenAction(t.id);
    if (!res.ok) {
      window.alert(res.error.message);
      return;
    }
    router.refresh();
  }

  function copyRaw() {
    if (!justCreated) return;
    void navigator.clipboard.writeText(justCreated.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* One-shot reveal banner — only visible right after creation */}
      {justCreated && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-400/40 dark:bg-amber-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Tu token está listo — cópialo ahora
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300/80">
                Por seguridad no podrás verlo otra vez. Guárdalo en un
                gestor de contraseñas o en las variables de entorno de
                tu integración.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="block flex-1 min-w-0 truncate rounded-lg border border-amber-300/60 bg-white px-3 py-2 font-mono text-xs text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100">
                  {justCreated.raw}
                </code>
                <Button type="button" onClick={copyRaw} variant="primary" size="sm">
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setJustCreated(null)}
                className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-900 underline dark:text-amber-200"
              >
                Lo he guardado — ocultar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {creating ? (
        <form
          onSubmit={onCreate}
          className="space-y-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-5 dark:border-white/10 dark:bg-[color:var(--color-surface-1)]"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor="token-name">Nombre del token</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                placeholder="HubSpot prod"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
                Un nombre para identificar el token después
                (ej. &quot;HubSpot prod&quot;, &quot;App móvil&quot;).
              </p>
            </div>
            <div>
              <Label htmlFor="token-exp">Caducidad</Label>
              <select
                id="token-exp"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="mt-1.5 h-11 rounded-xl border border-[color:var(--color-ink-200)] bg-white px-3 text-sm font-semibold text-[color:var(--color-ink-900)] outline-none focus:border-[color:var(--color-brand-400)] dark:border-white/15 dark:bg-white/[0.04] dark:text-white"
              >
                <option value={30}>30 días</option>
                <option value={90}>90 días (recomendado)</option>
                <option value={180}>180 días</option>
                <option value={365}>1 año</option>
                <option value={0}>Sin caducidad</option>
              </select>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreating(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={pending || !name}>
              {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
              Generar token
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setCreating(true)} variant="primary">
            <Plus /> Generar nuevo token
          </Button>
        </div>
      )}

      {/* Existing tokens table */}
      <div className="overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white dark:border-white/10 dark:bg-[color:var(--color-surface-1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-ink-100)] text-left text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)] dark:border-white/10 dark:text-white/55">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Prefijo</th>
                <th className="px-4 py-3">Caducidad</th>
                <th className="px-4 py-3">Último uso</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-ink-100)] dark:divide-white/5">
              {tokens.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-[color:var(--color-ink-500)] dark:text-white/55"
                  >
                    <KeyRound className="mx-auto mb-2 h-6 w-6 text-[color:var(--color-ink-300)] dark:text-white/30" />
                    Aún no has generado ningún token API.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-semibold text-[color:var(--color-ink-900)] dark:text-white">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-ink-600)] dark:text-white/65">
                      {t.prefix}…
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.expiresAt ? (
                        <span
                          className={
                            new Date(t.expiresAt).getTime() < nowAtMount
                              ? "rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                              : "text-[color:var(--color-ink-600)] dark:text-white/65"
                          }
                        >
                          {formatDate(t.expiresAt)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          Sin caducidad
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-ink-600)] dark:text-white/65">
                      {t.lastUsedAt ? formatRelative(t.lastUsedAt, nowAtMount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-ink-600)] dark:text-white/65">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRevoke(t)}
                        aria-label={`Revocar ${t.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-ink-200)] text-[color:var(--color-ink-500)] transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:text-white/65 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(iso);
}
