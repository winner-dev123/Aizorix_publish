import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getPatients } from "@/server/dashboard/queries";

export const revalidate = 30;

type SearchParams = Promise<{ q?: string; page?: string }>;

const PAGE_SIZE = 50;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) redirect("/signin");

  const { q, page: pageRaw } = await searchParams;
  const parsedPage = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const { rows: patients, total, page, totalPages } = await getPatients(
    clinicId,
    q,
    parsedPage,
    PAGE_SIZE,
  );

  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (targetPage > 1) sp.set("page", String(targetPage));
    return sp.size > 0 ? `/app/clients?${sp.toString()}` : "/app/clients";
  }
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + patients.length;

  function initials(p: { firstName: string; lastName: string | null }) {
    const a = p.firstName?.[0] ?? "";
    const b = p.lastName?.[0] ?? "";
    return (a + b).toUpperCase() || "?";
  }

  function statusBadge(s: "LEAD" | "ACTIVE" | "INACTIVE") {
    if (s === "ACTIVE") return <Badge variant="success">Activo</Badge>;
    if (s === "LEAD") return <Badge variant="brand">Lead</Badge>;
    return <Badge variant="outline">Inactivo</Badge>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-white/80 p-3 shadow-[var(--shadow-sm)] backdrop-blur">
        <form action="/app/clients" className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-400)]" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              className="h-10 pl-10"
              placeholder="Buscar nombre, teléfono o email…"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Buscar
          </Button>
          <span className="flex items-center gap-1.5 rounded-full bg-[color:var(--color-ink-50)] px-3 py-1 text-xs font-semibold text-[color:var(--color-ink-700)]">
            <Users className="h-3 w-3" /> {total} {total === 1 ? "cliente" : "clientes"}
          </span>
        </form>

        <Button asChild variant="primary" size="sm">
          <Link href="/app/clients/new">
            <Plus /> Nuevo cliente
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[color:var(--color-surface-2)] text-left text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-500)]">
              <tr>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Teléfono</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Citas</th>
                <th className="px-5 py-3.5">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[color:var(--color-ink-500)]">
                    {q ? `Sin resultados para "${q}".` : "No hay pacientes registrados todavía."}
                  </td>
                </tr>
              )}
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="group border-t border-[color:var(--color-ink-100)] transition hover:bg-[color:var(--color-surface-1)]"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/app/clients/${p.id}`}
                      className="flex items-center gap-3 font-medium"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#25d366] to-[#0d9488] text-xs font-black text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(13,148,136,0.45)]">
                        {initials(p)}
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--color-ink-900)] transition group-hover:text-[color:var(--color-brand-600)]">
                          {p.firstName}
                          {p.lastName ? ` ${p.lastName}` : ""}
                        </p>
                        <p className="text-xs text-[color:var(--color-ink-500)]">
                          {p.source ?? "Origen desconocido"}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4">{statusBadge(p.status)}</td>
                  <td className="px-5 py-4 text-[color:var(--color-ink-700)]">{p.phone}</td>
                  <td className="px-5 py-4 text-[color:var(--color-ink-500)]">{p.email ?? "—"}</td>
                  <td className="px-5 py-4 text-[color:var(--color-ink-700)]">
                    {p._count.appointments}
                  </td>
                  <td className="px-5 py-4 text-xs text-[color:var(--color-ink-500)]">
                    {formatInTimeZone(p.updatedAt, clinic.timezone, "d MMM yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer — only renders when there's more than one page,
            so the empty/small-clinic case stays clean. */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] px-5 py-3 text-xs text-[color:var(--color-ink-600)]">
            <p>
              Mostrando <span className="font-bold">{firstRow}–{lastRow}</span> de{" "}
              <span className="font-bold">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
                {page > 1 ? (
                  <Link href={pageHref(prevPage)}>
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
              <Button asChild={page < totalPages} variant="outline" size="sm" disabled={page >= totalPages}>
                {page < totalPages ? (
                  <Link href={pageHref(nextPage)}>
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
      </div>
    </div>
  );
}
