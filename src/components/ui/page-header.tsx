import * as React from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top-of-page intro block. Every dashboard route renders one of these so
 * the title, breadcrumb, and primary actions share a consistent shape and
 * vertical rhythm.
 *
 * - `eyebrow` + `icon` create the small uppercase label above the title
 *   (used to anchor the page to a section, e.g. "Configuración").
 * - `breadcrumbs` is rendered above eyebrow when present.
 * - `actions` is a slot on the right (typically a primary CTA or a row of
 *   filter chips).
 */

export type Crumb = { label: string; href?: string };

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  breadcrumbs,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs?.length ? (
          <nav
            aria-label="Migas de pan"
            className="mb-2 flex flex-wrap items-center gap-1 text-xs text-[color:var(--color-ink-500)]"
          >
            {breadcrumbs.map((c, i) => (
              <React.Fragment key={`${c.label}-${i}`}>
                {c.href ? (
                  <Link
                    href={c.href}
                    className="font-medium transition hover:text-[color:var(--color-ink-900)]"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-[color:var(--color-ink-700)]">
                    {c.label}
                  </span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-3 w-3 opacity-50" />
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}

        {eyebrow && (
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-600)]">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </p>
        )}

        <h1 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)] sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-ink-500)]">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
