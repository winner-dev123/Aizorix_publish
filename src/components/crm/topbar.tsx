"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Command,
  HelpCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  "/app/help": { title: "Ayuda", sub: "Guías y centro de soporte" },
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
  pendingAutomations = 0,
  notificationCount = 0,
}: {
  clinicName: string;
  userRole: string;
  userLabel: string;
  pendingAutomations?: number;
  notificationCount?: number;
}) {
  const pathname = usePathname();
  const fallback =
    pathname.startsWith("/app/clients/")
      ? { title: "Ficha de cliente", sub: "Datos, historial y conversaciones" }
      : { title: "Aizorix", sub: undefined };
  const meta = TITLES[pathname] ?? fallback;
  const accountInitials = (initials(clinicName) || "AI").toUpperCase();
  const roleSub = ROLE_LABEL[userRole] ?? "Equipo";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-3 px-4 md:px-6",
        // Glassmorphism — matches the reference's glassy topbar
        "border-b border-white/40 bg-white/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/65",
        "shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(15,21,44,0.08)]",
      )}
    >
      {/* Page title — only on mobile (sidebar shows it on desktop) */}
      <div className="min-w-0 flex-1 md:hidden">
        <h1 className="truncate pl-12 text-sm font-bold tracking-tight text-[color:var(--color-ink-900)]">
          {meta.title}
        </h1>
      </div>

      {/* Page meta (desktop) */}
      <div className="hidden min-w-0 md:block md:w-44 lg:w-56">
        <h1 className="truncate text-base font-bold tracking-tight text-[color:var(--color-ink-900)]">
          {meta.title}
        </h1>
        {meta.sub && (
          <p className="truncate text-[11px] text-[color:var(--color-ink-500)]">
            {meta.sub}
          </p>
        )}
      </div>

      {/* Central search — glass pill with kbd hint */}
      <div className="hidden flex-1 items-center md:flex">
        <div className="relative mx-auto w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-400)]" />
          <Input
            className="h-10 rounded-2xl border-transparent bg-white/85 pl-10 pr-16 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_16px_-8px_rgba(15,21,44,0.08)] hover:bg-white"
            placeholder="Buscar clientes, conversaciones, automatizaciones…"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--color-ink-500)]">
            <Command className="h-3 w-3" />K
          </span>
        </div>
      </div>

      {/* Automations chip — violet gradient, reference shows "Mis automatizaciones" here */}
      <Link
        href="/app/campaigns"
        className="hidden items-center gap-2 rounded-full bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(124,58,237,0.7)] active:scale-95 sm:inline-flex"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Mis automatizaciones
        {pendingAutomations > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black backdrop-blur">
            {pendingAutomations}
          </span>
        )}
      </Link>

      {/* Help link */}
      <Link
        href="/app/help"
        aria-label="Ayuda"
        className="hidden h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-ink-500)] transition hover:bg-[color:var(--color-ink-100)] hover:text-[color:var(--color-ink-900)] md:flex"
      >
        <HelpCircle className="h-4 w-4" />
      </Link>

      {/* Notification bell with badge */}
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-ink-600)] transition hover:bg-[color:var(--color-ink-100)] hover:text-[color:var(--color-ink-900)]"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {notificationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-1 text-[9px] font-black text-white">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
        {!notificationCount && (
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-[color:var(--color-brand-500)]" />
        )}
      </button>

      {/* Profile pill */}
      <button
        type="button"
        className="ml-0.5 flex items-center gap-2.5 rounded-full border border-[color:var(--color-ink-100)] bg-white py-1 pl-1 pr-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        title={userLabel || undefined}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-xs font-black text-white shadow-[0_4px_10px_-4px_rgba(124,58,237,0.5)]">
          {accountInitials}
        </div>
        <div className="hidden md:block">
          <p className="max-w-[140px] truncate text-xs font-bold leading-none text-[color:var(--color-ink-900)]">
            {clinicName}
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--color-ink-500)]">{roleSub}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
      </button>
    </header>
  );
}
