import { Fragment } from "react";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, Plus } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentControls } from "@/components/dashboard/appointment-controls";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getAgendaWeek } from "@/server/dashboard/queries";
import { assertModuleActive } from "@/server/modules/guard";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 09:00 – 19:00 clinic-local

// Polled every 30s by the wrapping refresh — see `revalidate`.
export const revalidate = 30;

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;
  await assertModuleActive(clinicId, "agenda");

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) redirect("/signin");
  const tz = clinic.timezone;

  const { appointments } = await getAgendaWeek(clinicId);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Group by clinic-local day so a Madrid clinic doesn't see appointments
  // jump days when the browser TZ differs.
  const byDay: Record<string, typeof appointments> = {};
  for (const a of appointments) {
    const key = formatInTimeZone(a.startsAt, tz, "yyyy-MM-dd");
    (byDay[key] ||= []).push(a);
  }

  const upcoming = [...appointments].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );

  function patientName(a: (typeof appointments)[number]) {
    return `${a.patient.firstName}${a.patient.lastName ? ` ${a.patient.lastName}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              Próximos 7 días
            </CardTitle>
            <p className="mt-1 text-xs text-[color:var(--color-ink-500)]">
              {appointments.length} citas · zona {tz}
            </p>
          </div>
          <Button variant="primary" size="sm">
            <Plus /> Nueva cita
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-6">
          <div className="grid min-w-[940px] grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-2">
            <div />
            {days.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div
                  key={d.toISOString()}
                  className={`rounded-xl border p-2 text-center transition ${
                    isToday
                      ? "border-[color:var(--color-brand-300)] bg-gradient-to-br from-[color:var(--color-brand-50)] to-white shadow-[var(--shadow-sm)]"
                      : "border-transparent"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                    {d.toLocaleDateString("es-ES", { weekday: "short" })}
                  </p>
                  <p
                    className={`mt-0.5 text-xl font-black ${
                      isToday
                        ? "text-[color:var(--color-brand-600)]"
                        : "text-[color:var(--color-ink-900)]"
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}

            {HOURS.map((h) => (
              <Fragment key={`row-${h}`}>
                <div className="pr-2 pt-2 text-right text-[11px] font-semibold text-[color:var(--color-ink-400)]">
                  {String(h).padStart(2, "0")}:00
                </div>
                {days.map((d) => {
                  const key = formatInTimeZone(d, tz, "yyyy-MM-dd");
                  const slots = (byDay[key] ?? []).filter(
                    (a) => Number(formatInTimeZone(a.startsAt, tz, "H")) === h,
                  );
                  return (
                    <div
                      key={`${d.toISOString()}-${h}`}
                      className="min-h-14 rounded-xl border border-dashed border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)]/40 p-1 transition hover:border-[color:var(--color-ink-200)] hover:bg-white"
                    >
                      {slots.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg bg-gradient-to-br from-[#ffd24a] via-[#f5c842] to-[#ff8a5b] px-2 py-1.5 text-[10px] font-semibold text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(255,138,91,0.45)]"
                        >
                          <p className="truncate font-bold">{patientName(a)}</p>
                          <p className="truncate text-[9px] opacity-80">
                            {a.treatment.name} · {a.technician.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Citas próximas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {upcoming.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] p-6 text-center text-sm text-[color:var(--color-ink-500)]">
              No hay citas en los próximos 7 días.
            </p>
          )}
          {upcoming.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd24a] to-[#ff8a5b] text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(255,138,91,0.45)]">
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                    {formatInTimeZone(a.startsAt, tz, "MMM")}
                  </span>
                  <span className="text-lg font-black leading-none">
                    {formatInTimeZone(a.startsAt, tz, "d")}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-[color:var(--color-ink-900)]">{patientName(a)}</p>
                  <p className="text-xs text-[color:var(--color-ink-500)]">
                    {a.treatment.name} · {a.technician.name}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div>
                  <p className="text-sm font-bold text-[color:var(--color-ink-900)]">
                    {formatInTimeZone(a.startsAt, tz, "EEE d MMM HH:mm")}
                  </p>
                  <Badge
                    variant={a.status === "CONFIRMED" ? "success" : "warning"}
                    className="mt-1"
                  >
                    {a.status === "CONFIRMED" ? "Confirmada" : a.status}
                  </Badge>
                </div>
                <AppointmentControls
                  appointmentId={a.id}
                  startsAtLocal={formatInTimeZone(a.startsAt, tz, "yyyy-MM-dd'T'HH:mm")}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
