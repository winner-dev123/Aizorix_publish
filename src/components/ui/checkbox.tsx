"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled,
  id,
  className,
}: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-brand-200)]/55",
        checked
          ? "border-[#7c3aed] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.55)]"
          : "border-[color:var(--color-ink-200)] bg-white hover:border-[color:var(--color-brand-400)] hover:bg-[color:var(--color-brand-50)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}
