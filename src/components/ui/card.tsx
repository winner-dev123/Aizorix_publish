import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Cards in the Aizorix design system. Variants:
 *   - default: white, subtle border, soft shadow.
 *   - glass:   semi-transparent white with backdrop-blur (premium feel).
 *   - dark:    deep navy (used inside the dark sidebar shell).
 *   - violet:  faint violet-tinted gradient, used for primary feature cards.
 *
 * Optional flags via `interactive` (adds lift/glow on hover) and `sweep`
 * (light streak that wipes across on hover — used on landing/sector cards).
 */

const cardVariants = cva(
  "relative rounded-2xl text-[color:var(--color-ink-900)]",
  {
    variants: {
      variant: {
        default:
          "border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]",
        glass: "glass-card",
        dark:
          "border border-white/10 bg-gradient-to-br from-[#11102a] to-[#0a0916] text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]",
        violet:
          "border border-[color:var(--color-brand-200)]/60 bg-gradient-to-br from-[color:var(--color-brand-50)] via-white to-[color:var(--color-brand-50)]/60 shadow-[var(--shadow-sm)]",
        outline:
          "border border-[color:var(--color-ink-200)] bg-transparent",
      },
      interactive: {
        true: "card-violet-glow cursor-pointer",
        false: "",
      },
      sweep: {
        true: "card-sweep",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      sweep: false,
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, sweep, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, sweep }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-4", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-[color:var(--color-ink-900)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[color:var(--color-ink-500)]", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
  );
}
