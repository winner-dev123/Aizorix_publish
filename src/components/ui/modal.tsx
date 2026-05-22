"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight modal/dialog without a Radix dependency. Renders into a
 * portal at <body>, traps focus inside while open, closes on ESC or
 * backdrop click. Use `onOpenChange` for controlled state.
 *
 *   <Modal open={open} onOpenChange={setOpen} title="Crear cliente">
 *     <p>...</p>
 *     <ModalFooter>
 *       <Button onClick={() => setOpen(false)}>Cancelar</Button>
 *       <Button variant="primary" onClick={...}>Guardar</Button>
 *     </ModalFooter>
 *   </Modal>
 *
 * Note: this is intentionally minimal. If a future page needs nested
 * modals, ARIA-AA labeling, or richer focus management, swap to
 * @radix-ui/react-dialog (the API is similar).
 */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Max content width — sm | md | lg | xl. Default "md". */
  size?: "sm" | "md" | "lg" | "xl";
  /** Hide the close (X) button in the header. */
  hideClose?: boolean;
  className?: string;
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  hideClose,
  className,
}: ModalProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  // ESC closes
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Auto-focus the dialog so keyboard users land inside
  React.useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-in fade-in"
      />

      {/* Dialog */}
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "relative w-full overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_30px_80px_-24px_rgba(15,21,44,0.45)] anim-fade-up focus:outline-none",
          SIZE[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <header className="flex items-start justify-between gap-4 border-b border-[color:var(--color-ink-100)] p-5">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-bold tracking-tight text-[color:var(--color-ink-900)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[color:var(--color-ink-500)]">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--color-ink-500)] transition hover:bg-[color:var(--color-ink-100)] hover:text-[color:var(--color-ink-900)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </header>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-5 flex items-center justify-end gap-2 border-t border-[color:var(--color-ink-100)] pt-4",
        className,
      )}
      {...props}
    />
  );
}
