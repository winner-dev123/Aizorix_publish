import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, CheckCircle2, Phone, Search, ShieldAlert, Sparkles, UserRound } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import {
  getConversationTranscript,
  getNeedsAttentionConversations,
  getRecentConversations,
} from "@/server/dashboard/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandoffActions } from "@/components/dashboard/handoff-actions";
import { cn } from "@/lib/utils";

export const revalidate = 30;

type SearchParams = Promise<{
  id?: string;
  filter?: "all" | "needs-human";
  q?: string;
}>;

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) redirect("/signin");
  const tz = clinic.timezone;

  const { id: activeId, filter, q } = await searchParams;
  const effectiveFilter = filter ?? "all";
  const conversations =
    effectiveFilter === "needs-human"
      ? await getNeedsAttentionConversations(clinicId, q)
      : await getRecentConversations(clinicId, q);

  const active = activeId
    ? await getConversationTranscript(clinicId, activeId)
    : conversations[0]
      ? await getConversationTranscript(clinicId, conversations[0].id)
      : null;

  function patientLabel(c: { patient: { firstName: string; lastName: string | null; phone: string } | null; externalChatId: string | null }) {
    if (c.patient) {
      return `${c.patient.firstName}${c.patient.lastName ? ` ${c.patient.lastName}` : ""}`;
    }
    return c.externalChatId ?? "Desconocido";
  }

  // Preserve `?q=` across filter-chip clicks so toggling Todas/Necesitan
  // ayuda doesn't drop the user's search.
  const allHref = q ? `?filter=all&q=${encodeURIComponent(q)}` : "?filter=all";
  const needsHref = q
    ? `?filter=needs-human&q=${encodeURIComponent(q)}`
    : "?filter=needs-human";

  return (
    <div className="grid h-[calc(100vh-10rem)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex flex-col overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[color:var(--color-ink-100)] p-3 space-y-2">
          {/* Search: server-rendered GET form. Submits to the same route
              with ?q=<value> so the URL is shareable. Persists `filter`
              via the hidden input so the active filter chip stays
              selected after submitting. */}
          <form method="get" className="relative">
            <input type="hidden" name="filter" value={effectiveFilter} />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-ink-400)]" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre o teléfono…"
              className="h-9 pl-8 text-xs"
              aria-label="Buscar conversaciones"
            />
          </form>
          <div className="flex gap-1.5">
            <Link
              href={allHref}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                effectiveFilter === "all"
                  ? "bg-[color:var(--color-ink-900)] text-white"
                  : "bg-[color:var(--color-ink-50)] text-[color:var(--color-ink-600)] hover:bg-[color:var(--color-ink-100)]",
              )}
            >
              Todas
            </Link>
            <Link
              href={needsHref}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                effectiveFilter === "needs-human"
                  ? "bg-[color:var(--color-ink-900)] text-white"
                  : "bg-[color:var(--color-ink-50)] text-[color:var(--color-ink-600)] hover:bg-[color:var(--color-ink-100)]",
              )}
            >
              Necesitan ayuda
            </Link>
            {q && (
              <Link
                href={`?filter=${effectiveFilter}`}
                className="ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)] hover:underline"
                title="Limpiar búsqueda"
              >
                Limpiar
              </Link>
            )}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <li className="p-6 text-center text-xs text-[color:var(--color-ink-500)]">
              {effectiveFilter === "needs-human"
                ? q
                  ? `Sin resultados pendientes para "${q}".`
                  : "No hay conversaciones pendientes de revisión."
                : q
                  ? `Sin resultados para "${q}".`
                  : "No hay conversaciones todavía."}
            </li>
          )}
          {conversations.map((c) => {
            const isActive = active?.id === c.id;
            const last = c.messages[0];
            const initials = patientLabel(c)
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <li key={c.id}>
                <Link
                  href={`?filter=${effectiveFilter}&id=${c.id}`}
                  className={cn(
                    "relative flex w-full items-start gap-3 border-b border-[color:var(--color-ink-100)] p-3.5 text-left transition",
                    isActive
                      ? "bg-gradient-to-r from-[color:var(--color-brand-50)]/60 to-transparent"
                      : "hover:bg-[color:var(--color-surface-2)]",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-9 w-1 -translate-y-1/2 rounded-r-full bg-[color:var(--color-brand-400)]" />
                  )}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-xs font-black text-white shadow-[0_6px_14px_-6px_rgba(13,148,136,0.4)]">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-[color:var(--color-ink-900)]">
                        {patientLabel(c)}
                      </span>
                      <span className="shrink-0 text-[10px] text-[color:var(--color-ink-400)]">
                        {formatInTimeZone(c.lastMessageAt, tz, "HH:mm")}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[color:var(--color-ink-500)]">
                      {last?.content ?? "(sin mensajes)"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge variant="outline">{c.channel}</Badge>
                      {c.requiresHuman && <Badge variant="warning">Atención</Badge>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex flex-col overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]">
        {active ? <Thread conv={active} tz={tz} /> : <EmptyThread />}
      </section>
    </div>
  );
}

function EmptyThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center text-sm text-[color:var(--color-ink-500)]">
      <Sparkles className="h-8 w-8 text-[color:var(--color-brand-400)]" />
      <p>Selecciona una conversación para ver el historial.</p>
    </div>
  );
}

type ConversationWithDetails = NonNullable<
  Awaited<ReturnType<typeof getConversationTranscript>>
>;

function Thread({ conv, tz }: { conv: ConversationWithDetails; tz: string }) {
  const name = conv.patient
    ? `${conv.patient.firstName}${conv.patient.lastName ? ` ${conv.patient.lastName}` : ""}`
    : conv.externalChatId ?? "Desconocido";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const openHandoff = conv.handoffs.find(
    (h) => h.status === "OPEN" || h.status === "IN_PROGRESS",
  );

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#7c3aed] text-xs font-black text-white shadow-[0_6px_14px_-6px_rgba(124,108,245,0.45)]">
            {initials || "?"}
          </div>
          <div>
            <p className="font-bold text-[color:var(--color-ink-900)]">{name}</p>
            <p className="text-xs text-[color:var(--color-ink-500)]">
              {conv.channel} · {conv.patient?.phone ?? conv.externalChatId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conv.requiresHuman ? (
            <Badge variant="warning">
              <UserRound className="h-3 w-3" /> Pendiente humano
            </Badge>
          ) : (
            <Badge variant="success">
              <Bot className="h-3 w-3" /> IA atendiendo
            </Badge>
          )}
          {conv.patient?.phone && (
            <Button variant="outline" size="icon" asChild>
              <a href={`tel:${conv.patient.phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </header>

      {conv.handoffs.length > 0 && <HandoffHistory handoffs={conv.handoffs} tz={tz} />}

      <div className="flex-1 space-y-4 overflow-y-auto bg-[color:var(--color-surface-2)] p-6">
        {conv.messages.length === 0 && (
          <p className="text-center text-sm text-[color:var(--color-ink-500)]">
            Aún no hay mensajes en esta conversación.
          </p>
        )}
        {conv.messages.map((m) => {
          const isPatient = m.role === "USER";
          const trace = readToolTrace(m.metadata);
          return (
            <div
              key={m.id}
              className={cn("flex flex-col gap-1", isPatient ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "group max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  isPatient
                    ? "rounded-tl-md bg-white text-[color:var(--color-ink-800)] ring-1 ring-[color:var(--color-ink-100)]"
                    : "rounded-tr-md bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_8px_22px_-10px_rgba(13,148,136,0.5)]",
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    isPatient
                      ? "text-[color:var(--color-ink-400)]"
                      : "text-[color:var(--color-ink-700)]/70",
                  )}
                >
                  {formatInTimeZone(m.createdAt, tz, "HH:mm")}
                </p>
              </div>
              {trace && trace.length > 0 && <ToolTraceDetail trace={trace} />}
            </div>
          );
        })}
      </div>

      <HandoffActions
        conversationId={conv.id}
        openHandoffId={openHandoff?.id ?? null}
        botPaused={conv.botPaused}
      />

    </>
  );
}

type ToolCall = { name: string; input: unknown; result: unknown };

/**
 * Pull the tool trace out of Message.metadata if it looks right. Returns
 * null when the message wasn't produced by orchestrate (e.g. manual reply
 * has metadata.source = "manual" instead).
 */
function readToolTrace(metadata: unknown): ToolCall[] | null {
  if (!metadata || typeof metadata !== "object") return null;
  const trace = (metadata as { toolTrace?: unknown }).toolTrace;
  if (!Array.isArray(trace)) return null;
  return trace as ToolCall[];
}

function ToolTraceDetail({ trace }: { trace: ToolCall[] }) {
  return (
    <details className="max-w-[75%] rounded-xl border border-[color:var(--color-ink-100)] bg-white/80 px-3 py-2 text-[11px] text-[color:var(--color-ink-600)] shadow-[var(--shadow-xs)]">
      <summary className="cursor-pointer select-none font-semibold uppercase tracking-wider text-[color:var(--color-ink-500)] outline-none">
        Detalle técnico · {trace.length}{" "}
        {trace.length === 1 ? "herramienta usada" : "herramientas usadas"}
      </summary>
      <ol className="mt-2 space-y-2">
        {trace.map((call, i) => (
          <li
            key={i}
            className="rounded-lg border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-2"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
              {i + 1}. {call.name}
            </p>
            <p className="mt-1 text-[10px] text-[color:var(--color-ink-500)]">input</p>
            <pre className="overflow-auto rounded bg-white px-2 py-1 font-mono text-[10px] text-[color:var(--color-ink-800)] ring-1 ring-[color:var(--color-ink-100)]">
              {safeStringify(call.input)}
            </pre>
            <p className="mt-1 text-[10px] text-[color:var(--color-ink-500)]">result</p>
            <pre className="overflow-auto rounded bg-white px-2 py-1 font-mono text-[10px] text-[color:var(--color-ink-800)] ring-1 ring-[color:var(--color-ink-100)]">
              {safeStringify(call.result)}
            </pre>
          </li>
        ))}
      </ol>
    </details>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type HandoffWithUser = ConversationWithDetails["handoffs"][number];

/**
 * Compact lifecycle bar above the message list. Renders newest first so an
 * open handoff is always on top. Resolved entries show who resolved them
 * (name → email → "—") and when. Reason text is truncated server-side at
 * 280 chars by the escalate_to_human tool, so we render it inline.
 */
function HandoffHistory({ handoffs, tz }: { handoffs: HandoffWithUser[]; tz: string }) {
  return (
    <div className="space-y-2 border-b border-[color:var(--color-ink-100)] bg-white/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
        Historial de escaladas
      </p>
      <ul className="space-y-1.5">
        {handoffs.map((h) => {
          const isOpen = h.status === "OPEN" || h.status === "IN_PROGRESS";
          const actor = h.user?.name ?? h.user?.email ?? "—";
          return (
            <li
              key={h.id}
              className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ring-1 ${
                isOpen
                  ? "bg-amber-50 text-amber-900 ring-amber-200/70"
                  : "bg-emerald-50 text-emerald-900 ring-emerald-200/70"
              }`}
            >
              {isOpen ? (
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {isOpen ? "Abierta" : "Resuelta"} ·{" "}
                  <span className="font-normal">{h.reason}</span>
                </p>
                <p className="mt-0.5 text-[10px] opacity-80">
                  Abierta {formatInTimeZone(h.openedAt, tz, "dd/MM/yyyy HH:mm")}
                  {h.resolvedAt && (
                    <>
                      {" · "}
                      Resuelta {formatInTimeZone(h.resolvedAt, tz, "dd/MM/yyyy HH:mm")}
                      {" por "}
                      <span className="font-semibold">{actor}</span>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
