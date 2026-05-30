import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon: LucideIcon;
  accent?: "brand" | "violet" | "emerald" | "sky" | "rose";
  className?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  // brand → violet (Aizorix AI palette). Kept as the default accent so
  // every page that doesn't specify one reads as on-brand.
  brand:
    "from-[#f5f3ff] to-white text-[#6d28d9] before:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.40),transparent_60%)]",
  violet:
    "from-violet-50 to-white text-violet-700 before:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.40),transparent_60%)]",
  emerald:
    "from-emerald-50 to-white text-emerald-700 before:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.32),transparent_60%)]",
  sky:
    "from-sky-50 to-white text-sky-700 before:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.32),transparent_60%)]",
  rose:
    "from-rose-50 to-white text-rose-700 before:bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.32),transparent_60%)]",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "brand",
  className,
}: StatCardProps) {
  const accentClasses = ACCENTS[accent];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden bg-gradient-to-br transition-all duration-300",
        "hover:-translate-y-1 hover:border-[color:var(--color-brand-200)] hover:shadow-[var(--glow-violet-soft)]",
        accentClasses.split(" ").filter((c) => c.startsWith("from-") || c.startsWith("to-")).join(" "),
        // Dark mode: flatten the light per-accent gradient onto a dark
        // surface; the accent stays alive via the `before:` radial glow
        // overlay below (which already uses the accent's coloured tint).
        "dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10 dark:hover:border-[color:var(--color-brand-400)]/40",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 before:absolute before:inset-0 before:opacity-90",
          accentClasses.split(" ").filter((c) => c.startsWith("before:")).join(" "),
        )}
      />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)]">
              {label}
            </p>
            <p className="mt-1.5 text-[28px] font-black leading-none tracking-tight text-[color:var(--color-ink-900)]">
              {value}
            </p>
            {delta && (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  delta.positive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {delta.positive ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {delta.value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-md)] ring-1 ring-[color:var(--color-ink-100)]",
              accentClasses.split(" ").filter((c) => c.startsWith("text-")).join(" "),
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
