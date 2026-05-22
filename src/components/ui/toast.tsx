"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal toast system. Wrap the app in <ToastProvider />, then use
 * `useToast()` anywhere to push a message. No dependencies — renders into
 * a portal at <body>.
 *
 *   const { push } = useToast();
 *   push({ title: "Guardado", variant: "success" });
 *
 * Variants: default | success | warning | danger | info.
 */

export type ToastVariant = "default" | "success" | "warning" | "danger" | "info";

export interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "description">> {
  description?: string;
}

interface ToastContextValue {
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used inside <ToastProvider>");
  }
  return ctx;
}

let nextId = 0;
function newId() {
  return `t-${++nextId}-${Date.now()}`;
}

// Stable references for the SSR-aware `mounted` flag below. Returning a
// constant `true` on the client lets us gate `createPortal(<div/>, body)`
// without running setState in an effect (which the React lint flags).
const subscribeNoop = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServer = () => false;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    getMountedSnapshot,
    getMountedServer,
  );

  const dismiss = React.useCallback((id: string) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (input: ToastInput) => {
      const id = input.id ?? newId();
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "default",
        duration: input.duration ?? 4200,
      };
      setItems((curr) => [...curr, item]);
      if (item.duration > 0) {
        window.setTimeout(() => dismiss(id), item.duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-full max-w-sm flex-col gap-2"
          >
            {items.map((t) => (
              <ToastView key={t.id} {...t} onClose={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

const VARIANT_STYLE: Record<ToastVariant, { ring: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  default: { ring: "ring-[color:var(--color-ink-200)]", bg: "bg-white", icon: Info },
  success: { ring: "ring-emerald-200", bg: "bg-emerald-50", icon: CheckCircle2 },
  warning: { ring: "ring-amber-200", bg: "bg-amber-50", icon: AlertCircle },
  danger:  { ring: "ring-red-200",   bg: "bg-red-50",     icon: AlertCircle },
  info:    { ring: "ring-violet-200",bg: "bg-violet-50",  icon: Info },
};

function ToastView({
  title,
  description,
  variant,
  onClose,
}: ToastItem & { onClose: () => void }) {
  const v = VARIANT_STYLE[variant];
  const Icon = v.icon;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border border-transparent p-3.5 shadow-[var(--shadow-lg)] ring-1 backdrop-blur-md anim-fade-up",
        v.bg,
        v.ring,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          variant === "success" && "text-emerald-600",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600",
          variant === "info" && "text-violet-600",
          variant === "default" && "text-[color:var(--color-ink-500)]",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--color-ink-900)]">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[color:var(--color-ink-600)]">{description}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[color:var(--color-ink-400)] transition hover:bg-black/5 hover:text-[color:var(--color-ink-900)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
