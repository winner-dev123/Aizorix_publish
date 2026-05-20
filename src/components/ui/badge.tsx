import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight uppercase whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-ink-100)] text-[color:var(--color-ink-700)] border border-[color:var(--color-ink-200)]/60",
        brand:
          "bg-gradient-to-br from-[color:var(--color-brand-100)] to-[color:var(--color-brand-200)] text-[color:var(--color-brand-700)] border border-[color:var(--color-brand-200)]",
        accent:
          "bg-[color:var(--color-ink-900)] text-[color:var(--color-brand-400)] border border-[color:var(--color-ink-800)]",
        success:
          "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
        warning: "bg-amber-50 text-amber-800 border border-amber-200/70",
        danger: "bg-red-50 text-red-700 border border-red-200/70",
        info: "bg-blue-50 text-blue-700 border border-blue-200/70",
        violet: "bg-violet-50 text-violet-700 border border-violet-200/70",
        outline:
          "border border-[color:var(--color-ink-200)] text-[color:var(--color-ink-600)] bg-white",
        glass:
          "bg-white/10 text-white border border-white/20 backdrop-blur-md",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
