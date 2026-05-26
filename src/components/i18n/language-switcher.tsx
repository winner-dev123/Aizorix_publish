"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";
import { useT } from "@/i18n/locale-context";
import { setLocaleAction } from "@/server/actions/locale";

/**
 * Language switcher. Sets the locale cookie via a server action, then calls
 * router.refresh() so every server component re-renders in the new
 * language (the cookie is read by getServerT / getLocale).
 *
 * `tone="dark"` renders for placement on a dark surface (e.g. the landing
 * header over a light bg uses "light"; the dashboard topbar uses "light").
 */
export function LanguageSwitcher({
  tone = "light",
  align = "right",
}: {
  tone?: "light" | "dark";
  align?: "left" | "right";
}) {
  const { locale } = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const current = LOCALE_META[locale];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={current.native}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition",
          tone === "dark"
            ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
            : "border-[color:var(--color-ink-200)] bg-white text-[color:var(--color-ink-700)] hover:border-[color:var(--color-brand-300)] hover:bg-[color:var(--color-brand-50)]",
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden uppercase sm:inline">{locale}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-1.5 shadow-[var(--shadow-lg)] anim-fade-up",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {LOCALES.map((l) => {
            const meta = LOCALE_META[l];
            const active = l === locale;
            return (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(l)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-[color:var(--color-brand-50)] font-bold text-[color:var(--color-brand-700)]"
                      : "text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-50)]",
                  )}
                >
                  <span className="text-base leading-none">{meta.flag}</span>
                  <span className="flex-1 text-left">{meta.native}</span>
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
