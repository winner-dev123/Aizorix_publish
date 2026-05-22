import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty state for pages that have no data yet (no clients, no
 * conversations, no campaigns…). Shows a violet halo, an icon, a friendly
 * title, helper copy, and a primary action slot.
 *
 * Use sparingly — a good empty state suggests next steps; don't drop
 * generic illustrations on every empty list.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** When true, renders a softer, smaller variant suitable for inline use. */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[color:var(--color-ink-200)] bg-white text-center",
        compact ? "px-6 py-8" : "px-8 py-14",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 65%)",
        }}
      />
      {Icon && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] text-[#6d28d9] ring-1 ring-[#c4b5fd]/60",
            compact ? "h-12 w-12" : "h-16 w-16",
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>
      )}
      <h3
        className={cn(
          "relative mt-4 font-black tracking-tight text-[color:var(--color-ink-900)]",
          compact ? "text-base" : "text-lg",
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="relative mt-1.5 max-w-md text-sm text-[color:var(--color-ink-500)]">
          {description}
        </p>
      )}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
