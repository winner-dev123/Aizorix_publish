import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared base style for Input, Textarea, and Select so every form field in
 * the app reads the same way. Focus state lights up the violet brand ring
 * (matches buttons + card hover). Disabled state dims to 50% and forbids
 * selection so a tab-through user doesn't land on something they can't
 * edit while still thinking they can type.
 */
const baseField =
  "flex w-full rounded-xl border border-[color:var(--color-ink-200)] bg-white px-4 py-2.5 text-sm text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-400)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-shadow focus-visible:border-[color:var(--color-brand-400)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-brand-200)]/55 disabled:cursor-not-allowed disabled:opacity-50 disabled:select-none";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(baseField, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(baseField, "min-h-[96px] py-3 leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      baseField,
      "h-11 appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d89a8' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>\")] bg-[length:14px_14px] bg-[right_14px_center] bg-no-repeat pr-10",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
