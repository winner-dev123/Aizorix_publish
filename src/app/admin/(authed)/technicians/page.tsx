import Link from "next/link";
import { Search, Stethoscope } from "lucide-react";
import { prisma } from "@/server/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RowDeleteButton } from "@/components/admin/row-delete-button";

export const revalidate = 0;

const PAGE_SIZE = 50;

type SearchParams = Promise<{ q?: string; page?: string }>;

/**
 * Cross-clinic technician browser. Mirrors the patients page shape so
 * the admin gets a consistent UX across resources. Each row includes
 * the clinic column + number of treatments the technician is assigned
 * to (a quick "is this technician still in use?" signal).
 */
export default async function AdminTechniciansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const term = (q ?? "").trim();

  const where = term
    ? {
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, technicians] = await Promise.all([
    prisma.technician.count({ where }),
    prisma.technician.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        prioritySensitive: true,
        createdAt: true,
        clinic: { select: { name: true, slug: true } },
        _count: {
          select: {
            treatments: true,
            appointments: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-300)]">
            Cross-tenant
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Técnicos
          </h1>
          <p className="text-sm text-white/60">
            {total.toLocaleString("es-ES")} en total · página {page} de{" "}
            {totalPages}
          </p>
        </div>

        <form
          action="/admin/technicians"
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[color:var(--color-surface-1)] p-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <Input
              name="q"
              defaultValue={term}
              placeholder="Nombre del técnico"
              className="h-9 w-72 pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Buscar
          </Button>
        </form>
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--color-surface-1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] font-bold uppercase tracking-wider text-white/55">
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Clínica</th>
                <th className="px-4 py-3 text-right">Tratamientos</th>
                <th className="px-4 py-3 text-right">Citas</th>
                <th className="px-4 py-3">Sensibilidad horaria</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {technicians.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-white/55"
                  >
                    <Stethoscope className="mx-auto mb-2 h-6 w-6 text-white/30" />
                    {term
                      ? `Sin resultados para "${term}".`
                      : "No hay técnicos en la plataforma."}
                  </td>
                </tr>
              ) : (
                technicians.map((t) => (
                  <tr
                    key={t.id}
                    className="text-white/80 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-semibold">
                        {t.clinic.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {t._count.treatments}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {t._count.appointments}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.prioritySensitive ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          Sí
                        </span>
                      ) : (
                        <span className="text-white/50">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RowDeleteButton
                        kind="technician"
                        id={t.id}
                        label={t.name}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Pagination page={page} totalPages={totalPages} term={term} />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  term,
}: {
  page: number;
  totalPages: number;
  term: string;
}) {
  if (totalPages <= 1) return null;
  const href = (n: number) => {
    const sp = new URLSearchParams();
    if (term) sp.set("q", term);
    if (n > 1) sp.set("page", String(n));
    return sp.size > 0
      ? `/admin/technicians?${sp.toString()}`
      : "/admin/technicians";
  };
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-white/65">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold hover:border-white/30 hover:text-white"
        >
          ← Anterior
        </Link>
      )}
      <span className="px-2">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={href(page + 1)}
          className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold hover:border-white/30 hover:text-white"
        >
          Siguiente →
        </Link>
      )}
    </div>
  );
}
