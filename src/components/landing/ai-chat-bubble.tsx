"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating "talk to the AI" bubble on the public landing page.
 *
 * Hits the same orchestrator that powers /app/ai's real mode, via the
 * public /api/chat/landing endpoint (which uses channel=WEB and a
 * sessionStorage-stable visitor id so these conversations stay off the
 * WhatsApp inbox).
 *
 * UX matches /app/ai's chat closely:
 *   - Greeting bubble on mount.
 *   - Typing indicator while the orchestrator is thinking.
 *   - Real LLM-generated replies, including tool actions (booking,
 *     escalation, etc.) — visitors literally talk to GPT.
 *   - "Reset" clears the local thread (sessionId stays so the bot can
 *     keep the patient if the user later signs up).
 *
 * Errors degrade gracefully into an inline notice instead of breaking
 * the conversation.
 */

interface Msg {
  from: "ai" | "user";
  text: string;
  /** Marks bot-detected escalation so we surface a softer UI hint. */
  requiresHuman?: boolean;
}

const STORAGE_KEY = "aizorix-landing-chat-session";

function newSessionId(): string {
  // 12 chars of base36 entropy is plenty for keying a conversation in
  // the orchestrator (we also prefix "landing:" server-side).
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = newSessionId();
      window.sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Privacy mode / quota — fall back to a per-tab in-memory id.
    return newSessionId();
  }
}

// useSyncExternalStore plumbing for SSR-safe session id read. The store
// notifies listeners when `reset()` rotates the id; the snapshot is
// cached so React's reference-equality check doesn't re-render forever.
const sessionIdListeners = new Set<() => void>();
let cachedSessionId: string | null = null;

const subscribeSessionId = (cb: () => void) => {
  sessionIdListeners.add(cb);
  return () => {
    sessionIdListeners.delete(cb);
  };
};
const getSessionIdSnapshot = () => {
  if (cachedSessionId === null) cachedSessionId = getOrCreateSessionId();
  return cachedSessionId;
};
const getServerSessionId = () => "";

function rotateSessionId(): string {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  cachedSessionId = null;
  const fresh = getOrCreateSessionId();
  sessionIdListeners.forEach((cb) => cb());
  return fresh;
}

const GREETING: Msg = {
  from: "ai",
  text: "¡Hola! 👋 Soy el recepcionista IA de Aizorix. Pregúntame por tratamientos, precios o intenta reservar una cita — respondo en tiempo real.",
};

export function AiChatBubble() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // SSR-safe session id: empty string on the server, a real id on the
  // client after hydration. Rotates when `reset()` is called.
  const sessionId = React.useSyncExternalStore(
    subscribeSessionId,
    getSessionIdSnapshot,
    getServerSessionId,
  );
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Scroll to bottom on every message change
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  // Focus the input after the panel opens
  React.useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 150);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // ESC closes the panel
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Cancel any in-flight request when the component unmounts.
  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    if (!sessionId) return; // not yet hydrated client-side

    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setTyping(true);
    setError(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
        signal: ctrl.signal,
      });
      const data: {
        respuesta?: string;
        requiresHuman?: boolean;
        error?: string;
        message?: string;
      } = await res.json().catch(() => ({}));

      if (!res.ok) {
        const friendly =
          data.message ??
          (data.error === "RATE_LIMITED"
            ? "Has enviado muchos mensajes seguidos. Espera unos segundos."
            : "La IA no pudo responder. Inténtalo en un momento.");
        setError(friendly);
        return;
      }

      const reply = (data.respuesta && data.respuesta.trim()) || "(sin respuesta)";
      setMessages((prev) => [
        ...prev,
        { from: "ai", text: reply, requiresHuman: data.requiresHuman === true },
      ]);
    } catch (err) {
      // Abort isn't a real error — only surface true network failures.
      if ((err as { name?: string }).name === "AbortError") return;
      setError("Error de conexión. Comprueba tu red e inténtalo de nuevo.");
    } finally {
      setTyping(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([GREETING]);
    setInput("");
    setError(null);
    setTyping(false);
    // Rotate sessionId so the server starts a fresh Conversation row —
    // matches the "Reiniciar" button on /app/ai. Notifies subscribers
    // via the store so the new id propagates into this render cycle.
    rotateSessionId();
  }

  return (
    <>
      {/* ───── Floating launcher button ───── */}
      <button
        type="button"
        aria-label={open ? "Cerrar chat con la IA" : "Hablar con la IA"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_42px_-12px_rgba(124,58,237,0.65)] transition-all duration-300",
          "bg-gradient-to-br from-[#a78bfa] via-[#7c3aed] to-[#6d28d9]",
          "hover:scale-110 hover:shadow-[0_22px_60px_-12px_rgba(124,58,237,0.85)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-brand-300)]/55",
          "active:scale-95",
        )}
      >
        {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[#7c3aed] opacity-40 animate-ping"
          />
        )}
        <span className="relative">
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </span>
        {!open && (
          <span className="absolute right-1 top-1 flex h-3 w-3">
            <span className="relative inline-flex h-full w-full rounded-full bg-emerald-400 ring-2 ring-white" />
          </span>
        )}
      </button>

      {/* ───── Chat panel ───── */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-40 flex w-[calc(100vw-3rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,21,44,0.35)] backdrop-blur-2xl anim-fade-up",
          )}
          style={{ maxHeight: "min(580px, calc(100vh - 8rem))" }}
          role="dialog"
          aria-label="Chat con la IA"
        >
          {/* Header — violet gradient */}
          <header className="relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#5b21b6] px-5 py-4 text-white">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#a78bfa]/40 blur-2xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
            <div className="relative flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                <Bot className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#1e1b4b] bg-emerald-400" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-black tracking-tight">
                  Asistente Aizorix
                  <Sparkles className="h-3 w-3 text-[#c4b5fd]" />
                </p>
                <p className="text-[11px] text-white/75">
                  IA en tiempo real · responde en segundos
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                aria-label="Nueva conversación"
                title="Nueva conversación"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-[color:var(--color-surface-1)] to-white p-4"
            style={{
              backgroundImage:
                "radial-gradient(rgba(124,58,237,0.05) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          >
            {messages.map((m, i) => {
              const isUser = m.from === "user";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col",
                    isUser ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm anim-fade-up",
                      isUser
                        ? "rounded-tr-md bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white"
                        : "rounded-tl-md bg-white text-[color:var(--color-ink-800)] ring-1 ring-[color:var(--color-ink-100)]",
                    )}
                  >
                    {m.text}
                  </div>
                  {m.requiresHuman && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/70">
                      Necesita atención humana
                    </span>
                  )}
                </div>
              );
            })}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-[color:var(--color-ink-100)]">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed] [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200/70">
                {error}
              </div>
            )}
          </div>

          {/* CTA banner — pushes to onboarding */}
          <Link
            href="/onboarding"
            className="group flex items-center justify-between gap-2 border-t border-[color:var(--color-ink-100)] bg-gradient-to-br from-[#f5f3ff] to-white px-4 py-2.5 text-[11px] font-semibold text-[#6d28d9] transition hover:from-[#ede9fe] hover:to-[#f5f3ff]"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              ¿Te gusta cómo responde? Conecta tu negocio.
            </span>
            <span className="inline-flex items-center gap-1 font-black">
              Empezar gratis
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          {/* Composer */}
          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-[color:var(--color-ink-100)] bg-white p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta lo que quieras a la IA…"
              disabled={typing || !sessionId}
              className="h-10 flex-1 rounded-lg border border-[color:var(--color-ink-200)] bg-[color:var(--color-surface-1)] px-4 text-sm text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-400)] focus:border-[color:var(--color-brand-400)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color:var(--color-brand-200)]/55 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Mensaje"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing || !sessionId}
              aria-label="Enviar mensaje"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.75)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_18px_-8px_rgba(124,58,237,0.55)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
