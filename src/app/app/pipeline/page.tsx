import { redirect } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Plus } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getPipelinePatients } from "@/server/dashboard/queries";
import { assertModuleActive } from "@/server/modules/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 30;

type Stage = "NUEVO" | "CONTACTADO" | "CITA" | "CLIENTE" | "INACTIVO";

const STAGES: { id: Stage; name: string; color: string }[] = [
  { id: "NUEVO", name: "Nuevo", color: "from-[#8ec0ff] to-[#2f88ff]" },
  { id: "CONTACTADO", name: "Contactado", color: "from-[#bcb1ff] to-[#7c6cf5]" },
  { id: "CITA", name: "Cita agendada", color: "from-[#ffd24a] to-[#f5c842]" },
  { id: "CLIENTE", name: "Cliente activo", color: "from-[#7eddb4] to-[#20bf7c]" },
  { id: "INACTIVO", name: "Inactivo", color: "from-[#ffb791] to-[#ff6a33]" },
];

type Patient = Awaited<ReturnType<typeof getPipelinePatients>>[number];

function stageFor(p: Patient): Stage {
  if (p.status === "INACTIVE") return "INACTIVO";
  if (p.status === "ACTIVE") return "CLIENTE";
  if (p.appointments.length > 0) return "CITA";
  if (p._count.conversations > 0) return "CONTACTADO";
  return "NUEVO";
}

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;
  await assertModuleActive(clinicId, "pipeline");

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) redirect("/signin");
  const tz = clinic.timezone;

  const patients = await getPipelinePatients(clinicId);
  const byStage = new Map<Stage, Patient[]>();
  for (const s of STAGES) byStage.set(s.id, []);
  for (const p of patients) byStage.get(stageFor(p))!.push(p);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-white/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-ink-900)]">
            {patients.length} {patients.length === 1 ? "paciente" : "pacientes"} en pipeline
          </p>
          <p className="text-xs text-[color:var(--color-ink-500)]">
            Movimiento por arrastre — próximamente.
          </p>
        </div>
        <Button variant="primary" size="sm">
          <Plus /> Nuevo cliente
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const cards = byStage.get(stage.id) ?? [];
          return (
            <div
              key={stage.id}
              className="flex flex-col gap-3 rounded-3xl border border-[color:var(--color-ink-100)] bg-white/70 p-3 backdrop-blur"
            >
              <div className="flex items-center justify-between px-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full bg-gradient-to-br ${stage.color}`}
                  />
                  <span className="text-sm font-bold text-[color:var(--color-ink-900)]">
                    {stage.name}
                  </span>
                  <Badge variant="outline">{cards.length}</Badge>
                </div>
                <button className="text-[color:var(--color-ink-400)] transition hover:text-[color:var(--color-ink-700)]">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {cards.map((p) => {
                  const fullName = `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`;
                  const initials = (p.firstName[0] ?? "") + (p.lastName?.[0] ?? "");
                  const nextAppt = p.appointments[0];
                  const lastContact = p.conversations[0]?.lastMessageAt ?? p.updatedAt;
                  return (
                    <Link
                      key={p.id}
                      href={`/app/clients/${p.id}`}
                      className="block rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-3.5 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-ink-200)] hover:shadow-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd24a] to-[#ff8a5b] text-[10px] font-black text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(255,138,91,0.45)]">
                          {initials.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{fullName}</p>
                          <p className="truncate text-[10px] uppercase tracking-wider text-[color:var(--color-ink-500)]">
                            {p.source ?? "Sin fuente"}
                          </p>
                        </div>
                      </div>
                      {nextAppt ? (
                        <p className="mt-3 line-clamp-2 text-xs leading-snug text-[color:var(--color-ink-700)]">
                          Próxima cita:{" "}
                          <span className="font-semibold">{nextAppt.treatment.name}</span>{" "}
                          ·{" "}
                          <span>{formatInTimeZone(nextAppt.startsAt, tz, "dd/MM HH:mm")}</span>
                        </p>
                      ) : (
                        <p className="mt-3 line-clamp-2 text-xs leading-snug text-[color:var(--color-ink-500)]">
                          {p._count.appointments === 0
                            ? "Sin citas todavía."
                            : `${p._count.appointments} cita(s) pasadas.`}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-1">
                        <Badge variant="brand">{p.status}</Badge>
                        <span className="text-[10px] text-[color:var(--color-ink-400)]">
                          {formatInTimeZone(lastContact, tz, "dd/MM/yyyy")}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                {cards.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[color:var(--color-ink-200)] bg-white/40 p-4 text-center text-xs text-[color:var(--color-ink-400)]">
                    Sin pacientes en este estado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
