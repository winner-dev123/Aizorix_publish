"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme";
import { setThemeAction } from "@/server/actions/theme";

const OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

interface ThemeToggleProps {
  /** Server-rendered initial theme (read from cookie). Keeps SSR/CSR aligned. */
  current: Theme;
  /** "light" → button styled for light surfaces, "dark" → for dark headers. */
  tone?: "light" | "dark";
  align?: "left" | "right";
}

/**
 * Sun/moon/system theme switcher. Sets the theme cookie via a server
 * action, then immediately applies `data-theme` to <html> client-side
 * (so the UI flips with no flicker) AND calls router.refresh() so any
 * server components re-render with the new theme on next paint.
 */
export function ThemeToggle({ current, tone = "light", align = "right" }: ThemeToggleProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  // Outside-click closes the menu.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(next: Theme) {
    setOpen(false);
    if (next === current) return;
    // Apply immediately so the user sees the switch before the server
    // re-render completes. The cookie write + refresh keep SSR honest.
    applyThemeAttribute(next);
    startTransition(async () => {
      await setThemeAction(next);
      router.refresh();
    });
  }

  const Icon = current === "dark" ? Moon : current === "system" ? Monitor : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Cambiar tema"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
          tone === "dark"
            ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
            : "border-[color:var(--color-ink-200)] bg-white text-[color:var(--color-ink-700)] hover:border-[color:var(--color-brand-300)] hover:bg-[color:var(--color-brand-50)]",
          pending && "opacity-60",
        )}
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-1.5 shadow-[var(--shadow-lg)] anim-fade-up",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {OPTIONS.map((o) => {
            const active = o.value === current;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-[color:var(--color-brand-50)] font-bold text-[color:var(--color-brand-700)]"
                      : "text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-50)]",
                  )}
                >
                  <o.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{o.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Sets the `data-theme` attribute on <html> client-side. For `system`,
 * we resolve to the OS preference via matchMedia so the user sees the
 * concrete result of their choice immediately.
 */
function applyThemeAttribute(theme: Theme) {
  if (typeof document === "undefined") return;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}
