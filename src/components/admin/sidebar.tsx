import Link from "next/link";
import {
  Building2,
  Database,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { signOutPlatformAdminAction } from "@/server/actions/admin";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { Theme } from "@/lib/theme";

interface AdminSidebarProps {
  adminEmail: string;
  adminName: string | null;
  /** Current theme cookie value — server-rendered so the toggle hydrates
   *  with the correct initial selection. */
  theme: Theme;
}

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clinics", label: "Clínicas", icon: Building2 },
  { href: "/admin/patients", label: "Pacientes", icon: Users },
  { href: "/admin/technicians", label: "Técnicos", icon: Stethoscope },
] as const;

/**
 * Server-rendered sidebar for the platform-admin shell. Distinct from
 * the clinic-app sidebar so there is zero risk of a clinic user
 * accidentally hitting an admin route. The sign-out form posts to a
 * server action that clears the dedicated admin cookie.
 */
export function AdminSidebar({ adminEmail, adminName, theme }: AdminSidebarProps) {
  return (
    /**
     * The sidebar is intentionally always-dark in BOTH themes — matches
     * the clinic-app sidebar pattern (`src/components/crm/sidebar.tsx`).
     * Only the main content area switches with the user's theme cookie.
     *
     * `data-theme="dark"` on the aside means `text-white`, `border-white/X`,
     * etc. inside it resolve to their dark-mode CSS-variable values even
     * when the surrounding shell is in light mode — without this, the
     * sidebar's CSS variables would still inherit the light-mode tokens
     * from the outer html, breaking the global "no white on dark" rules.
     */
    <aside
      data-theme="dark"
      className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-gradient-to-b from-[#0c0822] via-[#150e36] to-[#080518] text-white"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.45) 0%, transparent 65%)",
        }}
      />

      <div className="relative flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] shadow-[0_8px_22px_-10px_rgba(124,58,237,0.55)]">
          <ShieldCheck className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">
            Aizorix admin
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-brand-300)]">
            Platform
          </p>
        </div>
      </div>

      <nav className="relative flex-1 px-3 pb-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.07] hover:text-white"
              >
                <item.icon className="h-4 w-4 text-white/55 transition group-hover:text-white" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-3 text-[11px] text-amber-200/80">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-300">
            <Database className="h-3 w-3" />
            Cross-tenant
          </div>
          <p className="mt-1 leading-snug">
            Acciones aquí afectan a todas las clínicas. Todo queda registrado
            en el audit log.
          </p>
        </div>
      </nav>

      <div className="relative m-3 mt-0 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <p className="truncate text-xs font-bold text-white">
          {adminName ?? adminEmail}
        </p>
        {adminName && (
          <p className="truncate text-[10px] text-white/55">{adminEmail}</p>
        )}

        {/* Theme toggle — switches the MAIN content area only; the sidebar
            stays dark (it's the operator chrome, not the surface being read). */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/55">
            Tema
          </span>
          <ThemeToggle current={theme} tone="dark" align="right" />
        </div>

        <form action={signOutPlatformAdminAction}>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
