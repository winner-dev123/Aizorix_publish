import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Filter, ShieldCheck } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getRecentAuditLogs } from "@/server/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const revalidate = 0;

const ACTION_LABEL: Record<string, { label: string; tone: "brand" | "warning" | "success" | "outline" }> = {
  "clinic.updated": { label: "Datos del negocio", tone: "brand" },
  "ai_config.updated": { label: "Config IA", tone: "brand" },
  "ai_prompt.updated": { label: "Prompt IA editado", tone: "brand" },
  "ai_prompt.reset": { label: "Prompt IA restablecido", tone: "outline" },
  "business_hours.updated": { label: "Horarios", tone: "brand" },
  "modules.updated": { label: "Módulos", tone: "brand" },
  "staff.invited": { label: "Empleado invitado", tone: "success" },
  "staff.invite_resent": { label: "Enlace reenviado", tone: "outline" },
  "staff.activated": { label: "Empleado reactivado", tone: "success" },
  "staff.deactivated": { label: "Empleado desactivado", tone: "warning" },
  "staff.role_changed": { label: "Rol cambiado", tone: "brand" },
  "manual_reply.sent": { label: "Respuesta manual", tone: "outline" },
  "handoff.resolved": { label: "Escalada resuelta", tone: "success" },
  "bot.paused": { label: "Bot pausado", tone: "warning" },
  "bot.resumed": { label: "Bot reactivado", tone: "success" },
  "patient.created": { label: "Paciente creado", tone: "success" },
  "patient.updated": { label: "Paciente editado", tone: "brand" },
  "patient.notes_updated": { label: "Notas paciente", tone: "outline" },
  "memory.upserted": { label: "Memoria guardada", tone: "outline" },
  "memory.deleted": { label: "Memoria borrada", tone: "warning" },
  "appointment.created": { label: "Cita creada", tone: "success" },
  "appointment.cancelled": { label: "Cita cancelada", tone: "warning" },
  "appointment.rescheduled": { label: "Cita movida", tone: "brand" },
};

type SearchParams = Promise<{
  action?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const PAGE_SIZE = 50;

/**
 * Map an audit-log `target` string to a navigable dashboard URL, or null if
 * there's no obvious destination. Targets are emitted by the action layer
 * as "<type>:<id>" — see e.g. `target: "patient:${id}"` in patients.ts.
 * Unknown shapes (or types like `clinic:`/`conversation:` that are still
 * resolvable but less interesting) just stay as plain text.
 */
function targetHref(target: string | null): string | null {
  if (!target) return null;
  const colon = target.indexOf(":");
  if (colon <= 0) return null;
  const type = target.slice(0, colon);
  const id = target.slice(colon + 1);
  if (!id) return null;
  switch (type) {
    case "patient":
      return `/app/clients/${id}`;
    case "appointment":
      return `/app/agenda`; // No per-appointment page yet; nearest landing.
    case "conversation":
      return `/app/conversations?id=${id}`;
    case "memory":
      // Memories live on the patient page; the id is `patientId:key`.
      return `/app/clients/${id.split(":")[0]}`;
    case "user":
      return `/app/settings/staff`;
    case "handoff":
      return `/app/conversations`;
    case "clinic":
      return `/app/settings/clinic`;
    default:
      return null;
  }
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/app/settings");
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { timezone: true },
  });
  if (!clinic) redirect("/signin");

  const { action: actionFilter, from: fromRaw, to: toRaw, page: pageRaw } = await searchParams;
  // Validate the action against the known map — drops typo'd / malicious values
  // before they hit the DB. Unknown values just unfilter.
  const validatedAction =
    actionFilter && actionFilter in ACTION_LABEL ? actionFilter : undefined;
  const from = parseDate(fromRaw);
  const to = parseDate(toRaw);
  const parsedPage = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const { rows: logs, total, page, totalPages } = await getRecentAuditLogs(
    session.user.clinicId,
    100, // unused when page/pageSize are passed
    {
      action: validatedAction,
      from,
      to,
      page: parsedPage,
      pageSize: PAGE_SIZE,
    },
  );

  // Forward the current filters into the CSV download so what's on screen
  // matches what gets exported.
  const exportQuery = new URLSearchParams();
  if (validatedAction) exportQuery.set("action", validatedAction);
  if (fromRaw) exportQuery.set("from", fromRaw);
  if (toRaw) exportQuery.set("to", toRaw);
  const exportHref =
    exportQuery.size > 0
      ? `/api/audit/export.csv?${exportQuery.toString()}`
      : "/api/audit/export.csv";
  const hasFilter = !!validatedAction || !!fromRaw || !!toRaw;

  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (validatedAction) sp.set("action", validatedAction);
    if (fromRaw) sp.set("from", fromRaw);
    if (toRaw) sp.set("to", toRaw);
    if (targetPage > 1) sp.set("page", String(targetPage));
    return sp.size > 0 ? `/app/settings/audit?${sp.toString()}` : "/app/settings/audit";
  }
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + logs.length;

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              Registro de acciones
            </CardTitle>
            <p className="mt-1 text-sm text-[color:var(--color-ink-500)]">
              Últimas 100 acciones del personal (cambios de configuración, invitaciones,
              respuestas manuales, resolución de escaladas). Append-only — no se editan ni se
              borran.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={exportHref} download>
              <Download className="h-4 w-4" /> Exportar CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter bar — server-rendered <form method="get"> so the resulting
              URL is bookmarkable and shareable. Server reads searchParams above. */}
          <form
            method="get"
            className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3"
          >
            <div className="flex items-center gap-1.5 text-[color:var(--color-ink-500)]">
              <Filter className="h-3.5 w-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-wider">Filtros</p>
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <Label htmlFor="action" className="text-[10px] font-semibold text-[color:var(--color-ink-500)]">
                Acción
              </Label>
              <select
                id="action"
                name="action"
                defaultValue={validatedAction ?? ""}
                className="h-9 rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 text-xs"
              >
                <option value="">Todas</option>
                {Object.entries(ACTION_LABEL).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="from" className="text-[10px] font-semibold text-[color:var(--color-ink-500)]">
                Desde
              </Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={fromRaw ?? ""}
                className="h-9 w-36 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="to" className="text-[10px] font-semibold text-[color:var(--color-ink-500)]">
                Hasta
              </Label>
              <Input
                id="to"
                name="to"
                type="date"
                defaultValue={toRaw ?? ""}
                className="h-9 w-36 text-xs"
              />
            </div>
            <Button type="submit" variant="primary" size="sm">
              Aplicar
            </Button>
            {hasFilter && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/settings/audit">Limpiar</Link>
              </Button>
            )}
          </form>

          {hasFilter && (
            <p className="mb-3 text-xs text-[color:var(--color-ink-500)]">
              <span className="font-bold">{total}</span> {total === 1 ? "fila" : "filas"} en
              total con los filtros aplicados.
            </p>
          )}

          {logs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] bg-white/40 p-8 text-center text-sm text-[color:var(--color-ink-500)]">
              Aún no hay acciones registradas.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {logs.map((log) => {
                const label = ACTION_LABEL[log.action] ?? {
                  label: log.action,
                  tone: "outline" as const,
                };
                const actor = log.actor?.name ?? log.actor?.email ?? "—";
                const href = targetHref(log.target);
                return (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3 text-xs"
                  >
                    <div className="min-w-[140px] shrink-0">
                      <Badge variant={label.tone}>{label.label}</Badge>
                      <p className="mt-1 font-mono text-[10px] text-[color:var(--color-ink-400)]">
                        {log.action}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[color:var(--color-ink-700)]">
                        <span className="font-bold">{actor}</span>
                        {log.target ? (
                          href ? (
                            <>
                              {" · "}
                              <Link
                                href={href}
                                className="font-mono text-[color:var(--color-brand-600)] hover:underline"
                              >
                                {log.target}
                              </Link>
                            </>
                          ) : (
                            <span className="text-[color:var(--color-ink-500)]">
                              {" · "}
                              {log.target}
                            </span>
                          )
                        ) : null}
                      </p>
                      {log.metadata && (
                        <pre className="mt-1 overflow-auto rounded bg-white px-2 py-1 font-mono text-[10px] text-[color:var(--color-ink-700)] ring-1 ring-[color:var(--color-ink-100)]">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-[color:var(--color-ink-400)]">
                      {formatInTimeZone(log.createdAt, clinic.timezone, "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination footer — only when there's more than one page. */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] px-4 py-2.5 text-xs text-[color:var(--color-ink-600)]">
              <p>
                Mostrando <span className="font-bold">{firstRow}–{lastRow}</span> de{" "}
                <span className="font-bold">{total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild={page > 1}
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                >
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </span>
                  )}
                </Button>
                <span className="px-1 font-semibold text-[color:var(--color-ink-700)]">
                  Página {page} / {totalPages}
                </span>
                <Button
                  asChild={page < totalPages}
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                >
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)}>
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span>
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
