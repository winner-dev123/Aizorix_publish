import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section heading used between `PageHeader` and the first content block on
 * a long page (e.g. "Métricas" / "Equipo" inside Settings). Slightly less
 * weight than PageHeader so it doesn't compete.
 */
export interface SectionTitleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function SectionTitle({
  title,
  description,
  icon: Icon,
  eyebrow,
  actions,
  className,
  ...props
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] text-[#6d28d9] ring-1 ring-[#c4b5fd]/60">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-bold tracking-tight text-[color:var(--color-ink-900)]">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-[color:var(--color-ink-500)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
