import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, Phone, Sparkles, UserRound } from "lucide-react";
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
import { HandoffActions } from "@/components/dashboard/handoff-actions";
import { cn } from "@/lib/utils";

export const revalidate = 30;

type SearchParams = Promise<{ id?: string; filter?: "all" | "needs-human" }>;

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

  const { id: activeId, filter } = await searchParams;
  const effectiveFilter = filter ?? "all";
  const conversations =
    effectiveFilter === "needs-human"
      ? await getNeedsAttentionConversations(clinicId)
      : await getRecentConversations(clinicId);

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

  return (
    <div className="grid h-[calc(100vh-10rem)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex flex-col overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[color:var(--color-ink-100)] p-3">
          <div className="flex gap-1.5">
            <Link
              href="?filter=all"
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
              href="?filter=needs-human"
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                effectiveFilter === "needs-human"
                  ? "bg-[color:var(--color-ink-900)] text-white"
                  : "bg-[color:var(--color-ink-50)] text-[color:var(--color-ink-600)] hover:bg-[color:var(--color-ink-100)]",
              )}
            >
              Necesitan ayuda
            </Link>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <li className="p-6 text-center text-xs text-[color:var(--color-ink-500)]">
              {effectiveFilter === "needs-human"
                ? "No hay conversaciones pendientes de revisión."
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
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd24a] to-[#ff8a5b] text-xs font-black text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(255,138,91,0.4)]">
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
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#bcb1ff] to-[#7c6cf5] text-xs font-black text-white shadow-[0_6px_14px_-6px_rgba(124,108,245,0.45)]">
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

      <div className="flex-1 space-y-4 overflow-y-auto bg-[color:var(--color-surface-2)] p-6">
        {conv.messages.length === 0 && (
          <p className="text-center text-sm text-[color:var(--color-ink-500)]">
            Aún no hay mensajes en esta conversación.
          </p>
        )}
        {conv.messages.map((m) => {
          const isPatient = m.role === "USER";
          return (
            <div key={m.id} className={cn("flex", isPatient ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "group max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  isPatient
                    ? "rounded-tl-md bg-white text-[color:var(--color-ink-800)] ring-1 ring-[color:var(--color-ink-100)]"
                    : "rounded-tr-md bg-gradient-to-br from-[#ffd24a] via-[#f5c842] to-[#ff8a5b] text-[color:var(--color-ink-900)] shadow-[0_8px_22px_-10px_rgba(255,138,91,0.5)]",
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
            </div>
          );
        })}
      </div>

      <HandoffActions
        conversationId={conv.id}
        openHandoffId={openHandoff?.id ?? null}
      />

    </>
  );
}
