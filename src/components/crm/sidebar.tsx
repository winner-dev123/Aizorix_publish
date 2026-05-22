"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  MessagesSquare,
  Calendar,
  Megaphone,
  BarChart3,
  Settings,
  Bot,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { AizorixLogo } from "@/components/brand/aizorix-logo";
import { cn } from "@/lib/utils";

import type { ModuleKey } from "@/server/actions/module-catalogue";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Workspace" | "Comunicación" | "Crecimiento" | "Sistema";
  badge?: string;
  // When present, this nav entry is hidden if the clinic has the matching
  // module key disabled. Entries without `moduleKey` are core (always shown).
  moduleKey?: ModuleKey;
}

function buildNav(needsAttentionCount: number): NavItem[] {
  return [
    { href: "/app", label: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
    {
      href: "/app/pipeline",
      label: "Pipeline",
      icon: KanbanSquare,
      group: "Workspace",
      moduleKey: "pipeline",
    },
    { href: "/app/clients", label: "Clientes", icon: Users, group: "Workspace" },
    {
      href: "/app/conversations",
      label: "Conversaciones",
      icon: MessagesSquare,
      group: "Comunicación",
      // Only show the badge when there's something needing attention. The
      // value comes from the server-side count of WhatsApp conversations
      // flagged requiresHuman=true (passed in via props).
      badge: needsAttentionCount > 0 ? String(needsAttentionCount) : undefined,
    },
    {
      href: "/app/agenda",
      label: "Agenda",
      icon: Calendar,
      group: "Comunicación",
      moduleKey: "agenda",
    },
    {
      href: "/app/ai",
      label: "IA Recepcionista",
      icon: Bot,
      group: "Comunicación",
      moduleKey: "ai-demo",
    },
    {
      href: "/app/campaigns",
      label: "Campañas IA",
      icon: Megaphone,
      group: "Crecimiento",
      moduleKey: "campaigns",
    },
    {
      href: "/app/metrics",
      label: "Métricas",
      icon: BarChart3,
      group: "Crecimiento",
      moduleKey: "metrics",
    },
    { href: "/app/settings", label: "Configuración", icon: Settings, group: "Sistema" },
  ];
}

const GROUPS: NavItem["group"][] = [
  "Workspace",
  "Comunicación",
  "Crecimiento",
  "Sistema",
];

export function CrmSidebar({
  needsAttentionCount = 0,
  clinicName = "Aizorix",
  treatmentCount = 0,
  userCount = 0,
  technicianCount = 0,
  activeModules,
}: {
  needsAttentionCount?: number;
  clinicName?: string;
  treatmentCount?: number;
  userCount?: number;
  technicianCount?: number;
  /**
   * Module keys the clinic has enabled. When `undefined` (e.g. an
   * unauthenticated render of the layout shell), all entries are shown.
   * When defined, entries with a `moduleKey` not in this set are hidden.
   */
  activeModules?: readonly ModuleKey[];
}) {
  const pathname = usePathname();
  const activeSet = activeModules ? new Set(activeModules) : null;
  const nav = buildNav(needsAttentionCount).filter(
    (n) => !n.moduleKey || !activeSet || activeSet.has(n.moduleKey),
  );

  // Mobile-only open/close state. On `md`+ screens the sidebar is always
  // in document flow (sticky column), so `open` is irrelevant — the
  // translate classes are overridden by `md:translate-x-0`.
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile overlay is open so the page below
  // doesn't bleed through inertial-scroll the user's thumb generates.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on any nav link click via delegation — fires synchronously before
  // the route change, so the overlay's gone by the time the new page paints.
  const closeOnLinkClick = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
  };

  return (
    <>
      {/* Hamburger trigger — fixed top-left on mobile, hidden when the
          overlay is open and on desktop. z-40 sits above the topbar (z-20)
          and below the open sidebar (z-50). */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-ink-100)] bg-white text-[color:var(--color-ink-700)] shadow-sm md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Backdrop for the mobile overlay. Click to close. */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        onClick={closeOnLinkClick}
        className={cn(
          // Dark navy shell — mirrors the Aizorix AI landing mock: deep
          // ink background, subtle violet bleed at the top, white nav text.
          "h-screen w-64 shrink-0 flex-col border-r border-white/5 text-white",
          "bg-gradient-to-b from-[#0f0d1a] via-[#11102a] to-[#0a0916]",
          // Mobile: fixed overlay, slides in from left.
          "fixed inset-y-0 left-0 z-50 flex transition-transform duration-200 ease-out",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          // Desktop: in document flow as a sticky column, always visible.
          "md:sticky md:top-0 md:z-auto md:flex md:translate-x-0 md:shadow-none",
        )}
      >
        {/* Subtle violet aurora at the top of the sidebar */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 65%)",
          }}
        />

        <div className="relative flex h-16 items-center justify-between px-5">
          <Link href="/app" className="transition hover:opacity-90" onClick={() => setOpen(false)}>
            <AizorixLogo />
          </Link>
          {/* Close button — mobile only. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      <nav className="relative flex-1 overflow-y-auto px-3 pb-3">
        {GROUPS.map((group) => {
          const items = nav.filter((n) => n.group === group);
          return (
            <div key={group} className="mt-5 first:mt-2">
              <p className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/app" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                          active
                            ? "bg-gradient-to-r from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] text-white shadow-[0_8px_22px_-10px_rgba(124,58,237,0.65)]"
                            : "text-white/70 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5",
                        )}
                      >
                        {/* Glow halo on active item (subtle, decorative) */}
                        {active && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -right-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full opacity-60 blur-2xl"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(196,181,253,0.65) 0%, transparent 65%)",
                            }}
                          />
                        )}
                        <item.icon
                          className={cn(
                            "relative h-4 w-4 shrink-0 transition-transform duration-300",
                            active
                              ? "text-white"
                              : "text-white/55 group-hover:text-white group-hover:scale-110",
                          )}
                        />
                        <span className="relative flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "relative rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                              active
                                ? "bg-white text-[#6d28d9]"
                                : "bg-[#7c3aed] text-white",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Clinic info card — violet glass on dark */}
      <div className="relative m-3 mt-0">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
          <span
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 65%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-brand-300)]">
              <Sparkles className="h-3.5 w-3.5" /> Tu clínica
            </div>
            <p className="mt-2 max-w-[180px] truncate text-sm font-bold text-white">
              {clinicName}
            </p>
            <p className="text-xs text-white/55">
              {treatmentCount} {treatmentCount === 1 ? "tratamiento" : "tratamientos"} ·{" "}
              {technicianCount} {technicianCount === 1 ? "técnico/a" : "técnicos"}
            </p>
            <p className="text-xs text-white/55">
              {userCount} {userCount === 1 ? "empleado/a activo/a" : "empleados activos"}
            </p>
            <Link
              href="/app/settings"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--color-brand-300)] transition hover:text-white"
            >
              Ajustes <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
