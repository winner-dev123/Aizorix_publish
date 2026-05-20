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
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
        checked
          ? "border-[color:var(--color-ink-900)] bg-[color:var(--color-ink-900)] text-[color:var(--color-brand-400)] shadow-[0_4px_10px_-4px_rgba(6,10,28,0.4)]"
          : "border-[color:var(--color-ink-200)] bg-white hover:border-[color:var(--color-ink-400)] hover:bg-[color:var(--color-ink-50)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}
