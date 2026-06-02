import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import {
  ApiTokensManager,
  type ApiTokenRow,
} from "@/components/dashboard/api-tokens-manager";

export const revalidate = 0;

/**
 * Self-service API tokens for the clinic.
 *
 * Gate: OWNER / ADMIN of the clinic. RECEPTIONIST / STAFF get a
 * read-only message — they can SEE this page exists in the sidebar
 * config eventually, but cannot create tokens, since tokens grant full
 * clinic-data access via /api/v1/*.
 */
export default async function ApiTokensSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const tokens = await prisma.apiToken.findMany({
    where: { clinicId: session.user.clinicId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      createdBy: { select: { email: true } },
    },
  });

  const rows: ApiTokenRow[] = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: t.scopes,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    createdBy: t.createdBy?.email ?? null,
  }));

  const canManage =
    session.user.role === "OWNER" || session.user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1 text-sm text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)] dark:text-white/60 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a configuración
      </Link>

      <header className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-600)] dark:border-white/15 dark:bg-white/[0.05] dark:text-white/65">
          <ShieldCheck className="h-3 w-3 text-[color:var(--color-brand-500)]" />
          Acceso restringido
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[color:var(--color-ink-900)] dark:text-white">
          Tokens API
        </h1>
        <p className="max-w-2xl text-sm text-[color:var(--color-ink-500)] dark:text-white/65">
          Genera tokens para conectar tu CRM externo (HubSpot, Pipedrive,
          Zoho, etc.), tu app móvil o cualquier integración. Cada token
          tiene acceso completo a los datos de esta clínica — guárdalos
          con el mismo cuidado que una contraseña.
        </p>
      </header>

      {!canManage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
          Solo el propietario o un administrador de la clínica puede
          generar o revocar tokens. Tienes acceso de solo lectura.
        </div>
      )}

      {canManage ? (
        <ApiTokensManager tokens={rows} />
      ) : (
        <ApiTokensManager tokens={rows} />
      )}

      <section className="rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-5 text-sm dark:border-white/10">
        <p className="font-bold text-[color:var(--color-ink-900)] dark:text-white">
          Documentación
        </p>
        <p className="mt-1 text-[color:var(--color-ink-600)] dark:text-white/70">
          La API REST pública v1 está documentada en{" "}
          <code className="rounded bg-[color:var(--color-ink-100)] px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]">
            docs/API.md
          </code>{" "}
          del repositorio. Auth: cabecera{" "}
          <code className="rounded bg-[color:var(--color-ink-100)] px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]">
            Authorization: Bearer azx_live_…
          </code>
          .
        </p>
      </section>
    </div>
  );
}
