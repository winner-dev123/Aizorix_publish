import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getHomeDashboard } from "@/server/dashboard/queries";
import { getRecentAuditLogs } from "@/server/audit";
import { StatCard } from "@/components/crm/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/utils";

export const revalidate = 30;

export default async function CrmDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) redirect("/signin");
  const tz = clinic.timezone;

  const data = await getHomeDashboard(clinicId);
  const userName = session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "";

  // Audit log preview is gated to OWNER/ADMIN — staff users see the full
  // dashboard without the operational-history surface.
  const canViewAudit = session.user.role === "OWNER" || session.user.role === "ADMIN";
  const recentAudit = canViewAudit ? (await getRecentAuditLogs(clinicId, 5)).rows : [];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#5b21b6] p-7 text-white shadow-[0_24px_60px_-20px_rgba(76,29,149,0.5)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.6) 0%, transparent 60%)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 60%)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="glass-violet" className="mb-3">
              <Sparkles className="h-3 w-3" /> {clinic.name}
            </Badge>
            <h2 className="text-2xl font-black tracking-[-0.02em] text-white sm:text-3xl">
              {userName ? `Hola, ${userName} · ` : ""}tu CRM está activo
            </h2>
            <p className="mt-1 max-w-xl text-sm text-white/75">
              {data.aiKpis.conversations > 0
                ? `La IA ha gestionado ${data.aiKpis.conversations} conversaciones en los últimos 30 días y creado ${data.aiKpis.appointmentsCreated} citas en automático.`
                : "Aún no hay conversaciones. Conecta WhatsApp para empezar a recibir mensajes."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="primary" size="md" className="bg-white text-[#6d28d9] hover:bg-white/90 hover:text-[#5b21b6] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.4)]">
              <Link href="/app/ai">
                <Bot /> Probar IA
              </Link>
            </Button>
            <Button asChild variant="glass" size="md" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50">
              <Link href="/app/campaigns">
                <TrendingUp /> Nueva campaña
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leads nuevos · 7d"
          value={data.stats.leadsLast7d.toLocaleString("es-ES")}
          delta={{
            value: data.stats.leadsLast7d > 0 ? "esta semana" : "sin actividad",
            positive: data.stats.leadsLast7d > 0,
          }}
          icon={Users}
          accent="brand"
        />
        <StatCard
          label="Conversaciones"
          value={data.recentConversations.length.toLocaleString("es-ES")}
          delta={{
            value:
              data.stats.unreadConvs > 0 ? `${data.stats.unreadConvs} sin leer` : "Sin pendientes",
            positive: data.stats.unreadConvs === 0,
          }}
          icon={MessageCircle}
          accent="violet"
        />
        <StatCard
          label="Citas próximas"
          value={data.stats.upcomingAppts.toLocaleString("es-ES")}
          delta={{
            value:
              data.stats.upcomingToday > 0 ? `${data.stats.upcomingToday} hoy` : "Nada hoy",
            positive: data.stats.upcomingToday > 0,
          }}
          icon={Calendar}
          accent="sky"
        />
        <StatCard
          label="Ingresos IA · 30d"
          value={formatEUR(data.stats.revenueLast30d)}
          delta={{ value: "Citas BOT completadas", positive: true }}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Próximas citas</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/agenda">
                Ver agenda <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.nextAppointments.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] bg-white/40 p-6 text-center text-sm text-[color:var(--color-ink-500)] dark:border-white/10 dark:bg-white/[0.02]">
                No hay citas futuras todavía.
              </p>
            )}
            {data.nextAppointments.map((a) => {
              const monthAbbr = formatInTimeZone(a.startsAt, tz, "MMM");
              const dayNum = formatInTimeZone(a.startsAt, tz, "d");
              const timeStr = formatInTimeZone(a.startsAt, tz, "HH:mm");
              const name = `${a.patient.firstName}${a.patient.lastName ? ` ${a.patient.lastName}` : ""}`;
              return (
                <Link
                  key={a.id}
                  href="/app/agenda"
                  className="group flex items-center gap-4 rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-3.5 transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-ink-200)] hover:shadow-md dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10 dark:hover:border-white/20"
                >
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-white shadow-[var(--shadow-sm)]">
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                      {monthAbbr}
                    </span>
                    <span className="text-lg font-black leading-none">{dayNum}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[color:var(--color-ink-900)]">
                      {name}
                    </p>
                    <p className="truncate text-xs text-[color:var(--color-ink-500)]">
                      {a.treatment.name} · {a.technician.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{timeStr}</p>
                    <Badge
                      variant={a.status === "CONFIRMED" ? "success" : "warning"}
                      className="mt-1"
                    >
                      {a.status === "CONFIRMED" ? "Confirmada" : "Pendiente"}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Conversaciones</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/conversations">Abrir</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.recentConversations.length === 0 && (
              <p className="px-2.5 py-4 text-center text-xs text-[color:var(--color-ink-500)]">
                Sin conversaciones todavía.
              </p>
            )}
            {data.recentConversations.map((c, i) => {
              const palette = [
                "from-[#a855f7] to-[#7c3aed]",
                "from-[#a78bfa] to-[#7c3aed]",
                "from-[#a78bfa] to-[#8b5cf6]",
                "from-[#5aa6ff] to-[#2f88ff]",
                "from-[#f9a3c2] to-[#e94585]",
              ];
              const name = c.patient
                ? `${c.patient.firstName}${c.patient.lastName ? ` ${c.patient.lastName}` : ""}`
                : c.externalChatId ?? "Desconocido";
              const initials = name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const preview = c.messages[0]?.content ?? "(sin mensajes)";
              return (
                <Link
                  key={c.id}
                  href={`/app/conversations?id=${c.id}`}
                  className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-[color:var(--color-surface-2)]"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${palette[i % palette.length]} text-xs font-black text-white shadow-[0_6px_14px_-6px_rgba(28,36,64,0.25)]`}
                  >
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-ink-900)]">
                      {name}
                    </p>
                    <p className="truncate text-xs text-[color:var(--color-ink-500)]">{preview}</p>
                  </div>
                  {c.requiresHuman && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] px-1.5 text-[10px] font-black text-white shadow-sm">
                      !
                    </span>
                  )}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-white/70 bg-gradient-to-br from-[#effdf6] via-white to-[#eff7ff] dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(76,212,154,0.45) 0%, transparent 60%)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(90,166,255,0.40) 0%, transparent 60%)" }}
        />
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2.5 text-[color:var(--color-ink-900)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white shadow-[0_6px_14px_-6px_rgba(32,191,124,0.55)]">
                <Bot className="h-4 w-4" />
              </span>
              Rendimiento de la IA · últimos 30 días
            </CardTitle>
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3" /> Operativa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative grid gap-4 md:grid-cols-4">
          <Mini
            label="Conversaciones gestionadas"
            value={data.aiKpis.conversations.toLocaleString("es-ES")}
            tint="mint"
          />
          <Mini
            label="Citas creadas"
            value={data.aiKpis.appointmentsCreated.toLocaleString("es-ES")}
            tint="sky"
          />
          <Mini
            label="Tasa de cierre"
            value={`${(data.aiKpis.closeRate * 100).toFixed(1).replace(".", ",")}%`}
            tint="lavender"
          />
          <Mini label="Ingresos atribuidos" value={formatEUR(data.aiKpis.revenue)} tint="brand" />
        </CardContent>
      </Card>

      {canViewAudit && recentAudit.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              Cambios recientes
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/settings/audit">
                Ver todo <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentAudit.map((log) => {
              const label = AUDIT_LABEL[log.action] ?? log.action;
              const actor = log.actor?.name ?? log.actor?.email ?? "—";
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-2.5 text-xs"
                >
                  <Badge variant="outline">{label}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[color:var(--color-ink-700)]">
                    <span className="font-semibold">{actor}</span>
                    {log.target ? (
                      <span className="text-[color:var(--color-ink-500)]"> · {log.target}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] text-[color:var(--color-ink-400)]">
                    {formatInTimeZone(log.createdAt, tz, "HH:mm")}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Human label map shared with /app/settings/audit. Unknown action keys fall
// through to the raw key string.
const AUDIT_LABEL: Record<string, string> = {
  "clinic.updated": "Datos del negocio",
  "ai_config.updated": "Config IA",
  "ai_prompt.updated": "Prompt IA editado",
  "ai_prompt.reset": "Prompt IA restablecido",
  "business_hours.updated": "Horarios",
  "modules.updated": "Módulos",
  "staff.invited": "Empleado invitado",
  "staff.invite_resent": "Enlace reenviado",
  "staff.activated": "Empleado reactivado",
  "staff.deactivated": "Empleado desactivado",
  "staff.role_changed": "Rol cambiado",
  "manual_reply.sent": "Respuesta manual",
  "handoff.resolved": "Escalada resuelta",
  "bot.paused": "Bot pausado",
  "bot.resumed": "Bot reactivado",
  "patient.created": "Paciente creado",
  "patient.updated": "Paciente editado",
  "patient.notes_updated": "Notas paciente",
  "memory.upserted": "Memoria guardada",
  "memory.deleted": "Memoria borrada",
  "appointment.created": "Cita creada",
  "appointment.cancelled": "Cita cancelada",
  "appointment.rescheduled": "Cita movida",
};

const TINTS: Record<string, { card: string; delta: string }> = {
  mint: {
    card: "from-[#effdf6] to-white ring-[color:var(--color-mint-100)]",
    delta: "text-[color:var(--color-mint-500)]",
  },
  sky: {
    card: "from-[#eff7ff] to-white ring-[color:var(--color-sky-100)]",
    delta: "text-[color:var(--color-sky-500)]",
  },
  lavender: {
    card: "from-[#f5f3ff] to-white ring-[color:var(--color-lavender-100)]",
    delta: "text-[color:var(--color-lavender-500)]",
  },
  brand: {
    card: "from-[#effdf6] to-white ring-[color:var(--color-brand-100)]",
    delta: "text-[color:var(--color-coral-500)]",
  },
};

function Mini({ label, value, tint }: { label: string; value: string; tint: keyof typeof TINTS }) {
  const t = TINTS[tint];
  return (
    <div
      className={`rounded-2xl border border-white/70 bg-gradient-to-br ${t.card} p-4 shadow-[var(--shadow-xs)] ring-1 dark:bg-none dark:bg-[color:var(--color-surface-2)] dark:border-white/10 dark:ring-white/10`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
        {value}
      </p>
    </div>
  );
}
