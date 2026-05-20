"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resolveHandoffAction,
  sendManualReplyAction,
} from "@/server/actions/appointments";

type Props = {
  conversationId: string;
  openHandoffId: string | null;
};

export function HandoffActions({ conversationId, openHandoffId }: Props) {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  function doSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(null);
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await sendManualReplyAction(conversationId, body);
      if (res.ok) {
        setText("");
        setSent("Mensaje enviado");
      } else {
        setError(res.error.message);
      }
    });
  }

  function doResolve() {
    if (!openHandoffId) return;
    setError(null);
    startTransition(async () => {
      const res = await resolveHandoffAction(openHandoffId);
      if (!res.ok) setError(res.error.message);
    });
  }

  return (
    <div className="border-t border-[color:var(--color-ink-100)] bg-white p-3">
      <form onSubmit={doSend} className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe una respuesta manual…"
          rows={2}
          disabled={pending}
          className="flex-1 resize-none rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm text-[color:var(--color-ink-900)] outline-none placeholder:text-[color:var(--color-ink-400)] focus:border-[color:var(--color-brand-400)] focus:ring-2 focus:ring-[color:var(--color-brand-200)]/40 disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              doSend(e);
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" size="sm" disabled={pending || !text.trim()}>
            <Send className="h-4 w-4" /> Enviar
          </Button>
          {openHandoffId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={doResolve}
            >
              <CheckCircle2 className="h-4 w-4" /> Marcar resuelto
            </Button>
          )}
        </div>
      </form>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>
      )}
      {sent && !error && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
          {sent}
        </p>
      )}
    </div>
  );
}
