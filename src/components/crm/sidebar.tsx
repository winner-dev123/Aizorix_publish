"use client";

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
  type LucideIcon,
} from "lucide-react";
import { AizorixLogo } from "@/components/brand/aizorix-logo";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Workspace" | "Comunicación" | "Crecimiento" | "Sistema";
  badge?: string;
}

function buildNav(needsAttentionCount: number): NavItem[] {
  return [
    { href: "/app", label: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
    { href: "/app/pipeline", label: "Pipeline", icon: KanbanSquare, group: "Workspace" },
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
    { href: "/app/agenda", label: "Agenda", icon: Calendar, group: "Comunicación" },
    { href: "/app/ai", label: "IA Recepcionista", icon: Bot, group: "Comunicación" },
    { href: "/app/campaigns", label: "Campañas IA", icon: Megaphone, group: "Crecimiento" },
    { href: "/app/metrics", label: "Métricas", icon: BarChart3, group: "Crecimiento" },
    { href: "/app/settings", label: "Configuración", icon: Settings, group: "Sistema" },
  ];
}

const GROUPS: NavItem["group"][] = [
  "Workspace",
  "Comunicación",
  "Crecimiento",
  "Sistema",
];

export function CrmSidebar({ needsAttentionCount = 0 }: { needsAttentionCount?: number }) {
  const pathname = usePathname();
  const nav = buildNav(needsAttentionCount);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[color:var(--color-ink-100)] bg-white/85 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/app" className="transition hover:opacity-90">
          <AizorixLogo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {GROUPS.map((group) => {
          const items = nav.filter((n) => n.group === group);
          return (
            <div key={group} className="mt-5 first:mt-2">
              <p className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-ink-400)]">
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
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                          active
                            ? "bg-gradient-to-r from-[#fffaeb] via-[#fff5f1] to-white text-[color:var(--color-ink-900)] shadow-[0_4px_14px_-6px_rgba(255,138,91,0.30)] ring-1 ring-[color:var(--color-brand-200)]/60"
                            : "text-[color:var(--color-ink-600)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink-900)]",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 -translate-x-1.5 rounded-full bg-gradient-to-b from-[#ffd24a] to-[#ff8a5b]" />
                        )}
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition",
                            active
                              ? "text-[color:var(--color-coral-500)]"
                              : "text-[color:var(--color-ink-500)] group-hover:text-[color:var(--color-ink-900)]",
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                              active
                                ? "bg-gradient-to-br from-[#ffd24a] to-[#ff8a5b] text-[color:var(--color-ink-900)]"
                                : "bg-[color:var(--color-ink-900)] text-white",
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

      {/* Upgrade card — bright */}
      <div className="m-3 mt-0">
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-[color:var(--color-brand-100)] via-[color:var(--color-coral-100)] to-[color:var(--color-lavender-100)] p-4 shadow-[var(--shadow-sm)]">
          <span
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--color-coral-500)]">
              <Sparkles className="h-3.5 w-3.5" /> Plan Pro
            </div>
            <p className="mt-2 text-sm font-bold text-[color:var(--color-ink-900)]">
              5 módulos activos
            </p>
            <p className="text-xs text-[color:var(--color-ink-600)]">
              1 sede · 4 empleados
            </p>
            <Link
              href="/app/settings"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--color-coral-500)] transition hover:text-[color:var(--color-coral-400)]"
            >
              Gestionar plan <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
