import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, BarChart3, TrendingUp, Users } from "lucide-react";
import { auth } from "@/auth";
import { getMetricsOverview, type MetricsOverview } from "@/server/dashboard/queries";
import { assertModuleActive } from "@/server/modules/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/utils";

export const revalidate = 30;

const DOW_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

type Kpi = { label: string; value: string; delta: number };

function buildKpis(k: MetricsOverview["kpis"]): Kpi[] {
  return [
    {
      label: "Leads (mes)",
      value: k.leadsThis.toLocaleString("es-ES"),
      delta: pctDelta(k.leadsThis, k.leadsLast),
    },
    {
      label: "Conversiones a cita",
      value: `${(k.conversionThis * 100).toFixed(1).replace(".", ",")}%`,
      delta: pctDelta(k.conversionThis, k.conversionLast),
    },
    {
      label: "Citas → ventas",
      value: `${(k.salesRateThis * 100).toFixed(1).replace(".", ",")}%`,
      delta: pctDelta(k.salesRateThis, k.salesRateLast),
    },
    {
      label: "Ingresos IA",
      value: formatEUR(k.revenueThis),
      delta: pctDelta(k.revenueThis, k.revenueLast),
    },
    {
      label: "Ticket medio",
      value: formatEUR(k.ticketAvgThis),
      delta: pctDelta(k.ticketAvgThis, k.ticketAvgLast),
    },
    {
      label: "Recuperación inactivos",
      value: k.inactiveRecoveredThis.toLocaleString("es-ES"),
      delta: pctDelta(k.inactiveRecoveredThis, k.inactiveRecoveredLast),
    },
  ];
}

export default async function MetricsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  await assertModuleActive(session.user.clinicId, "metrics");

  const data = await getMetricsOverview(session.user.clinicId);

  const kpis = buildKpis(data.kpis);
  const funnel = [
    { stage: "Leads", value: data.funnel.leads, color: "from-sky-400 to-sky-600" },
    {
      stage: "Conversaciones IA",
      value: data.funnel.conversations,
      color: "from-violet-400 to-violet-600",
    },
    {
      stage: "Citas agendadas",
      value: data.funnel.appointments,
      color: "from-[color:var(--color-brand-400)] to-[color:var(--color-brand-600)]",
    },
    {
      stage: "Ventas cerradas",
      value: data.funnel.sales,
      color: "from-emerald-400 to-emerald-600",
    },
  ];
  const max = Math.max(1, ...funnel.map((f) => f.value));
  const maxRev = Math.max(1, ...data.topStaff.map((s) => s.revenue));

  const peakDay =
    data.highlights.peakDow !== null && data.highlights.peakDow >= 1 && data.highlights.peakDow <= 7
      ? DOW_NAMES[data.highlights.peakDow - 1]
      : "—";

  const revenueShare =
    data.highlights.totalRevenueThisMonth > 0
      ? (data.highlights.starTreatmentRevenue / data.highlights.totalRevenueThisMonth) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((k) => {
          const positive = k.delta >= 0;
          const deltaStr = Number.isFinite(k.delta)
            ? `${Math.abs(k.delta).toFixed(1).replace(".", ",")}%`
            : "—";
          return (
            <Card key={k.label} className="card-hover overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)]">
                  {k.label}
                </p>
                <p className="mt-2 text-[32px] font-black leading-none tracking-tight text-[color:var(--color-ink-900)]">
                  {k.value}
                </p>
                <p
                  className={
                    positive
                      ? "mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"
                      : "mt-3 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"
                  }
                >
                  {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {deltaStr} vs mes anterior
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[color:var(--color-brand-500)]" />
                Embudo de conversión
              </CardTitle>
              <Badge variant="outline">Últimos 30 días</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnel.map((f, i) => {
              const pct = (f.value / max) * 100;
              const prev = i > 0 ? funnel[i - 1].value : null;
              const drop =
                prev !== null && prev > 0 ? Math.round((f.value / prev) * 100) : null;
              return (
                <div key={f.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-[color:var(--color-ink-900)]">
                      {f.stage}
                    </span>
                    <div className="flex items-center gap-2">
                      {drop !== null && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                          {drop}% paso
                        </span>
                      )}
                      <span className="text-sm font-bold text-[color:var(--color-ink-900)]">
                        {f.value.toLocaleString("es-ES")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[color:var(--color-ink-100)]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${f.color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              Rendimiento por empleado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topStaff.length === 0 && (
              <p className="text-sm text-[color:var(--color-ink-500)]">
                Aún no hay citas completadas este mes.
              </p>
            )}
            {data.topStaff.map((s) => {
              const initials = s.name
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div
                  key={s.technicianId}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#25d366] to-[#0d9488] text-xs font-black text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(13,148,136,0.45)]">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[color:var(--color-ink-900)]">
                      {s.name}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-500)]">
                      {s.appointments} {s.appointments === 1 ? "cita" : "citas"}
                    </p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--color-ink-100)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-brand-400)] to-[color:var(--color-brand-600)]"
                        style={{ width: `${(s.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[color:var(--color-ink-900)]">
                      {formatEUR(s.revenue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Mejor canal",
            value: "WhatsApp",
            note: `${data.funnel.conversations.toLocaleString("es-ES")} conversaciones en 30d`,
            color: "from-emerald-500/15 to-emerald-500/5",
            icon: TrendingUp,
          },
          {
            label: "Día pico",
            value: peakDay,
            note:
              data.highlights.peakDayCount > 0
                ? `${data.highlights.peakDayCount} citas completadas este mes`
                : "Sin datos suficientes todavía",
            color: "from-violet-500/15 to-violet-500/5",
            icon: BarChart3,
          },
          {
            label: "Tratamiento estrella",
            value: data.highlights.starTreatmentName ?? "—",
            note:
              data.highlights.starTreatmentRevenue > 0
                ? `${revenueShare.toFixed(1).replace(".", ",")}% del revenue del mes`
                : "Sin ingresos registrados este mes",
            color: "from-amber-500/15 to-amber-500/5",
            icon: TrendingUp,
          },
        ].map((h) => (
          <div
            key={h.label}
            className={`rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br ${h.color} p-5 backdrop-blur card-hover`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[color:var(--color-ink-900)] shadow-[var(--shadow-sm)]">
                <h.icon className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                {h.label}
              </p>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
              {h.value}
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-ink-600)]">{h.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
