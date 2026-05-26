import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Pencil,
  Sparkles,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getPatientDetail } from "@/server/dashboard/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientNotesEditor } from "@/components/dashboard/patient-notes-editor";
import { MemoriesEditor } from "@/components/dashboard/memories-editor";
import { AppointmentControls } from "@/components/dashboard/appointment-controls";
import { formatEUR } from "@/lib/utils";

export const revalidate = 30;

const STATUS_LABEL: Record<"LEAD" | "ACTIVE" | "INACTIVE", string> = {
  LEAD: "Lead",
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
};

const APPT_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No vino",
};

const APPT_TONE: Record<string, "success" | "warning" | "outline"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "outline",
  CANCELLED: "outline",
  NO_SHOW: "warning",
};

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) redirect("/signin");
  const tz = clinic.timezone;

  const { id } = await params;
  const patient = await getPatientDetail(clinicId, id);
  if (!patient) return notFound();

  const fullName = `${patient.firstName}${patient.lastName ? ` ${patient.lastName}` : ""}`;
  const initials = (patient.firstName[0] ?? "") + (patient.lastName?.[0] ?? "");
  const lastContactAt = patient.conversations[0]?.lastMessageAt ?? patient.updatedAt;

  // LTV = sum of treatment price for COMPLETED appointments.
  const ltv = patient.appointments.reduce((sum, a) => {
    if (a.status !== "COMPLETED") return sum;
    const price = a.treatment.price ? Number(a.treatment.price) : 0;
    return sum + price;
  }, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/app/clients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="relative h-32 bg-gradient-to-br from-[#effdf6] via-[#e6f4f1] to-[#f5f3ff]">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-70 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(13,148,136,0.45) 0%, transparent 60%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(155,140,255,0.4) 0%, transparent 60%)",
              }}
            />
          </div>

          <CardContent className="-mt-12 p-6 pt-0">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-3xl font-black text-white shadow-[0_18px_44px_-16px_rgba(13,148,136,0.55)] ring-4 ring-white">
                {initials.toUpperCase() || "?"}
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight">{fullName}</h2>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Badge variant="brand">{STATUS_LABEL[patient.status]}</Badge>
                {patient.gender && (
                  <Badge variant="outline">
                    {patient.gender === "FEMALE" ? "Mujer" : patient.gender === "MALE" ? "Hombre" : "Otro"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <Row icon={Phone} label="Teléfono" value={patient.phone} />
              {patient.email && <Row icon={Mail} label="Email" value={patient.email} />}
              {patient.source && (
                <Row icon={MessageCircle} label="Canal de captación" value={patient.source} />
              )}
              <Row
                icon={Calendar}
                label="Último contacto"
                value={formatInTimeZone(lastContactAt, tz, "dd/MM/yyyy HH:mm")}
              />
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-50)] to-[color:var(--color-brand-100)]/40 p-5 ring-1 ring-[color:var(--color-brand-200)]/50">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
                <Sparkles className="h-3 w-3" /> Valor histórico
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                {formatEUR(ltv)}
              </p>
              <p className="mt-1 text-[11px] text-[color:var(--color-ink-500)]">
                Suma de tratamientos realizados.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button variant="primary">
                <MessageCircle /> Enviar WhatsApp
              </Button>
              <Button asChild variant="outline">
                <Link href={`/app/agenda/new?patientId=${patient.id}`}>
                  <Calendar /> Reservar cita
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/app/clients/${patient.id}/edit`}>
                  <Pencil /> Editar ficha
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[color:var(--color-brand-500)]" /> Citas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.appointments.length === 0 ? (
                <p className="text-sm text-[color:var(--color-ink-500)]">
                  Sin citas registradas.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {patient.appointments.map((a) => {
                    // Only PENDING/CONFIRMED future appointments can be
                    // moved or cancelled — completed/cancelled/no-show are
                    // terminal states; rendering the controls would invite
                    // calls that the booking actions reject anyway.
                    const isMutable =
                      (a.status === "PENDING" || a.status === "CONFIRMED") &&
                      a.startsAt > new Date();
                    return (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-3.5"
                      >
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_6px_14px_-6px_rgba(47,136,255,0.45)]"
                          style={{ background: a.technician.color ?? "#2f88ff" }}
                        >
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[color:var(--color-ink-900)]">
                            {a.treatment.name}
                          </p>
                          <p className="text-xs text-[color:var(--color-ink-500)]">
                            {formatInTimeZone(a.startsAt, tz, "dd/MM/yyyy HH:mm")} ·{" "}
                            {a.technician.name}
                          </p>
                        </div>
                        <Badge variant={APPT_TONE[a.status] ?? "outline"}>
                          {APPT_LABEL[a.status] ?? a.status}
                        </Badge>
                        {isMutable && (
                          <AppointmentControls
                            appointmentId={a.id}
                            startsAtLocal={formatInTimeZone(a.startsAt, tz, "yyyy-MM-dd'T'HH:mm")}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[color:var(--color-brand-500)]" />{" "}
                Conversaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.conversations.length === 0 ? (
                <p className="text-sm text-[color:var(--color-ink-500)]">
                  Sin conversaciones aún.
                </p>
              ) : (
                <div className="space-y-3">
                  {patient.conversations.map((c) => {
                    const preview = c.messages[0]?.content ?? "(sin mensajes)";
                    return (
                      <Link
                        key={c.id}
                        href={`/app/conversations?id=${c.id}`}
                        className="block rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-4 transition hover:bg-white"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline">{c.channel}</Badge>
                          <span className="text-[color:var(--color-ink-500)]">
                            {formatInTimeZone(c.lastMessageAt, tz, "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-[color:var(--color-ink-800)]">
                          {preview}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[color:var(--color-brand-500)]" /> Memorias del bot
              </CardTitle>
              <p className="text-xs text-[color:var(--color-ink-500)]">
                Hechos duraderos que la IA reutilizará en futuras conversaciones — los puedes
                añadir, editar o borrar manualmente.
              </p>
            </CardHeader>
            <CardContent>
              <MemoriesEditor
                patientId={patient.id}
                initial={patient.memories.map((m) => ({
                  key: m.key,
                  value: m.value,
                  updatedAt: m.updatedAt.toISOString(),
                }))}
                tzFormatted={Object.fromEntries(
                  patient.memories.map((m) => [
                    m.key,
                    formatInTimeZone(m.updatedAt, tz, "dd/MM/yyyy HH:mm"),
                  ]),
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-[color:var(--color-brand-500)]" /> Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PatientNotesEditor patientId={patient.id} initial={patient.notes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-[var(--shadow-sm)]">
        <Icon className="h-3.5 w-3.5 text-[color:var(--color-ink-500)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-[color:var(--color-ink-900)]">{value}</p>
      </div>
    </div>
  );
}
