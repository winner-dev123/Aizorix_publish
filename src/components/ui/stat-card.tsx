import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KPI tile. Used on dashboards and the landing page. Accepts an icon, a
 * label, the big numeric value, optional trend, and an optional sparkline-
 * shaped accent. Designed to lift slightly on hover so a grid of these
 * feels alive.
 *
 * `tone` controls the icon-chip color: violet (brand-default), cyan, rose,
 * or amber. Stick to violet unless you're showing differentiated KPIs in
 * a row (e.g. activity vs revenue vs sentiment).
 */

export type StatTone = "violet" | "cyan" | "rose" | "amber" | "emerald";

const TONE_CHIP: Record<StatTone, string> = {
  violet:
    "bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] text-[#6d28d9] ring-1 ring-[#c4b5fd]/60",
  cyan: "bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 ring-1 ring-cyan-200/70",
  rose: "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 ring-1 ring-rose-200/70",
  amber: "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-1 ring-amber-200/70",
  emerald:
    "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 ring-1 ring-emerald-200/70",
};

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  /** "+24%" / "−3%" style — we render with a trend arrow when provided. */
  trend?: string;
  /** Defaults to inferring from the trend string ("+" up, "−"/"-" down). */
  trendDirection?: "up" | "down" | "neutral";
  /** Optional sub-label (e.g. "este mes"). */
  hint?: string;
  tone?: StatTone;
  /** When true, the whole card animates on hover. Default true. */
  interactive?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
  hint,
  tone = "violet",
  interactive = true,
  className,
  ...props
}: StatCardProps) {
  const direction =
    trendDirection ??
    (trend?.startsWith("+")
      ? "up"
      : trend?.startsWith("-") || trend?.startsWith("−")
        ? "down"
        : "neutral");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-5 shadow-[var(--shadow-sm)] transition-all duration-300",
        interactive &&
          "hover:-translate-y-1 hover:border-[color:var(--color-brand-200)] hover:shadow-[var(--glow-violet-soft)]",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 65%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)] sm:text-3xl">
            {value}
          </p>
          {(trend || hint) && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                    direction === "up" &&
                      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
                    direction === "down" &&
                      "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70",
                    direction === "neutral" &&
                      "bg-[color:var(--color-ink-100)] text-[color:var(--color-ink-700)]",
                  )}
                >
                  {direction === "up" && <TrendingUp className="h-3 w-3" />}
                  {direction === "down" && <TrendingDown className="h-3 w-3" />}
                  {trend}
                </span>
              )}
              {hint && (
                <span className="text-[color:var(--color-ink-500)]">{hint}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              TONE_CHIP[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
