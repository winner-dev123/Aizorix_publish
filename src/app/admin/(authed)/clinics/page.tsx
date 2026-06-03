import { Building2 } from "lucide-react";
import { prisma } from "@/server/db";

export const revalidate = 0;

/**
 * Read-only list of clinics on the platform. Intentionally NO delete
 * action here — deleting a clinic cascades patients, conversations,
 * appointments, audit logs, every API token, every staff user. That's
 * not a "click and confirm" operation; it'll get its own dedicated
 * archival flow in a follow-up.
 */
export default async function AdminClinicsPage() {
  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      plan: true,
      createdAt: true,
      _count: {
        select: {
          patients: true,
          technicians: true,
          treatments: true,
          users: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-600)] dark:text-[color:var(--color-brand-300)]">
          Cross-tenant
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
          Clínicas
        </h1>
        <p className="text-sm text-[color:var(--color-ink-500)]">
          {clinics.length.toLocaleString("es-ES")} clínicas registradas.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] dark:border-white/10 bg-[color:var(--color-surface-1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-ink-100)] dark:border-white/10 text-left text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                <th className="px-4 py-3">Clínica</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Zona horaria</th>
                <th className="px-4 py-3 text-right">Pacientes</th>
                <th className="px-4 py-3 text-right">Técnicos</th>
                <th className="px-4 py-3 text-right">Tratamientos</th>
                <th className="px-4 py-3 text-right">Usuarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-ink-100)] dark:divide-white/5">
              {clinics.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-[color:var(--color-ink-500)]"
                  >
                    <Building2 className="mx-auto mb-2 h-6 w-6 text-[color:var(--color-ink-300)]" />
                    Aún no hay clínicas registradas.
                  </td>
                </tr>
              ) : (
                clinics.map((c) => (
                  <tr key={c.id} className="text-[color:var(--color-ink-700)]">
                    <td className="px-4 py-3 font-semibold text-[color:var(--color-ink-900)]">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="rounded-full bg-[color:var(--color-brand-500)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-brand-600)] dark:text-[color:var(--color-brand-300)]">
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{c.timezone}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {c._count.patients.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {c._count.technicians}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {c._count.treatments}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {c._count.users}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
