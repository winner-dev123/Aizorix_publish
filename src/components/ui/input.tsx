import * as React from "react";
import { cn } from "@/lib/utils";

const baseField =
  "flex w-full rounded-xl border border-[color:var(--color-ink-200)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-400)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] focus-visible:border-[color:var(--color-brand-400)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-brand-200)]/60 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(baseField, "h-11", className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(baseField, "min-h-[96px] py-3", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";
