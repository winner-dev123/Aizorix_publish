"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Command, HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const TITLES: Record<string, { title: string; sub?: string }> = {
  "/app": { title: "Dashboard", sub: "Resumen de hoy y próximas acciones" },
  "/app/pipeline": { title: "Pipeline", sub: "Arrastra leads entre estados" },
  "/app/clients": { title: "Clientes", sub: "Tu base de clientes en un solo lugar" },
  "/app/conversations": {
    title: "Conversaciones",
    sub: "Bandeja unificada: WhatsApp, Instagram, Facebook",
  },
  "/app/agenda": { title: "Agenda", sub: "Citas confirmadas y huecos disponibles" },
  "/app/campaigns": {
    title: "Campañas inteligentes",
    sub: "Calcula el ROI antes de enviar",
  },
  "/app/ai": { title: "IA Recepcionista", sub: "Configura tu asistente 24/7" },
  "/app/metrics": { title: "Métricas", sub: "Datos en tiempo real" },
  "/app/settings": { title: "Configuración", sub: "Workspace, equipo y facturación" },
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Propietario/a",
  ADMIN: "Admin",
  RECEPTIONIST: "Recepción",
  STAFF: "Personal",
};

function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function CrmTopbar({
  clinicName,
  userRole,
  userLabel,
}: {
  clinicName: string;
  userRole: string;
  userLabel: string;
}) {
  const pathname = usePathname();
  const fallback =
    pathname.startsWith("/app/clients/")
      ? { title: "Ficha de cliente", sub: "Datos, historial y conversaciones" }
      : { title: "Aizorix CRM", sub: undefined };
  const meta = TITLES[pathname] ?? fallback;
  const accountInitials = (initials(clinicName) || "AI").toUpperCase();
  const roleSub = ROLE_LABEL[userRole] ?? "Equipo";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[color:var(--color-ink-100)] bg-white/85 px-6 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold tracking-tight text-[color:var(--color-ink-900)]">
          {meta.title}
        </h1>
        {meta.sub && (
          <p className="truncate text-xs text-[color:var(--color-ink-500)]">
            {meta.sub}
          </p>
        )}
      </div>

      <div className="hidden w-80 items-center md:flex">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-400)]" />
          <Input
            className="h-10 pl-10 pr-16 text-sm"
            placeholder="Buscar cliente, conversación…"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--color-ink-500)]">
            <Command className="h-3 w-3" />K
          </span>
        </div>
      </div>

      <button
        aria-label="Ayuda"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-ink-500)] transition hover:bg-[color:var(--color-ink-100)] hover:text-[color:var(--color-ink-900)]"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      <button
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-ink-600)] transition hover:bg-[color:var(--color-ink-100)] hover:text-[color:var(--color-ink-900)]"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[color:var(--color-brand-500)]" />
      </button>

      <div
        className="ml-1 flex items-center gap-2.5 rounded-full border border-[color:var(--color-ink-100)] bg-white py-1 pl-1 pr-3 shadow-sm transition hover:shadow-md"
        title={userLabel || undefined}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--color-brand-300)] to-[color:var(--color-brand-500)] text-xs font-black text-[color:var(--color-ink-900)]">
          {accountInitials}
        </div>
        <div className="hidden md:block">
          <p className="max-w-[160px] truncate text-xs font-bold leading-none text-[color:var(--color-ink-900)]">
            {clinicName}
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--color-ink-500)]">{roleSub}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
      </div>
    </header>
  );
}
