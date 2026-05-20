import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-300)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--color-ink-900)] text-white shadow-[0_8px_22px_-10px_rgba(15,21,44,0.55)] hover:bg-[color:var(--color-ink-800)] hover:shadow-[0_14px_36px_-12px_rgba(15,21,44,0.55)] active:scale-[0.97]",
        accent:
          "bg-gradient-to-br from-[#ffd24a] via-[#f5c842] to-[#ff8a5b] text-[color:var(--color-ink-900)] shadow-[0_10px_28px_-10px_rgba(255,138,91,0.55)] hover:shadow-[0_18px_42px_-12px_rgba(255,138,91,0.65)] hover:saturate-110 active:scale-[0.97]",
        outline:
          "border border-[color:var(--color-ink-200)] bg-white text-[color:var(--color-ink-800)] hover:border-[color:var(--color-ink-300)] hover:bg-[color:var(--color-surface-1)] hover:shadow-sm",
        ghost:
          "text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-100)]/80 hover:text-[color:var(--color-ink-900)]",
        link: "text-[color:var(--color-ink-800)] underline-offset-4 hover:underline px-0",
        destructive:
          "bg-[color:var(--color-danger)] text-white shadow-[0_8px_22px_-10px_rgba(239,68,68,0.55)] hover:opacity-95 active:scale-[0.97]",
        glass:
          "bg-white/80 text-[color:var(--color-ink-800)] border border-[color:var(--color-ink-200)]/60 backdrop-blur-md hover:bg-white hover:shadow-sm",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base [&_svg]:size-5",
        xl: "h-14 px-8 text-base [&_svg]:size-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
