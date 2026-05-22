"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Database,
  Mail,
  Phone,
  RotateCcw,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatEUR } from "@/lib/utils";
import {
  clearDemoConversationAction,
  runDemoTurnAction,
} from "@/server/actions/ai-demo";

export type DemoTreatment = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  botMessage: string | null;
};

interface Msg {
  from: "client" | "ai";
  text: string;
  at: number;
}

interface CapturedLead {
  name?: string;
  phone?: string;
  email?: string;
  treatment?: string;
}

import {
  detectTreatment,
  extractEmail,
  extractPhone,
  firstName,
  foldAccents,
  hasBookingIntent,
  hasConfirmation,
  parseBareNameAttempt,
  pickFresh,
} from "@/lib/ai-demo-heuristics";

function describeTreatment(tr: DemoTreatment): string {
  if (tr.botMessage) return tr.botMessage;
  const parts: string[] = [];
  if (tr.description) parts.push(tr.description);
  const pieces: string[] = [];
  pieces.push(`Dura aprox. ${tr.durationMinutes} min`);
  if (tr.price != null) pieces.push(`desde ${formatEUR(tr.price)}`);
  parts.push(pieces.join(" · ") + ".");
  return parts.join(" ");
}

export function AiDemo({
  clinicName,
  treatments,
}: {
  clinicName: string;
  treatments: DemoTreatment[];
}) {
  // useState lazy init runs exactly once at mount — escapes the React
  // purity rule that flags Date.now() called during render. The greeting
  // freezes at mount-time and stays stable for the life of the component.
  const [initialAi] = useState<Msg>(() => ({
    from: "ai",
    text: `¡Hola! 👋 Bienvenido/a a ${clinicName}. Soy la asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?`,
    at: Date.now(),
  }));

  const [messages, setMessages] = useState<Msg[]>([initialAi]);
  const [lead, setLead] = useState<CapturedLead>({});
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  // Default to "real" — every new chat session hits OpenAI through the
  // orchestrator. The simulated heuristic stays available behind the toggle
  // for offline/no-cost testing, but it is no longer the first experience.
  const [mode, setMode] = useState<"simulated" | "real">("real");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [appointmentCreated, setAppointmentCreated] = useState<{
    time: string;
    treatment: string;
    name: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function pushAI(text: string) {
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "ai", text, at: Date.now() }]);
      setTyping(false);
    }, 700);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "client", text, at: Date.now() }]);
    setInput("");

    if (mode === "real") {
      runRealTurn(text);
      return;
    }

    // Accumulate every field we can extract from THIS message onto whatever
    // we had captured before — we never lose state across turns.
    const newLead = { ...lead };
    const phone = extractPhone(text);
    if (phone && !newLead.phone) newLead.phone = phone;
    const email = extractEmail(text);
    if (email && !newLead.email) newLead.email = email;
    const name = parseBareNameAttempt(text, { expectingName: !newLead.name });
    if (name && !newLead.name) newLead.name = name;
    const matched = detectTreatment(text, treatments);
    if (matched && !newLead.treatment) newLead.treatment = matched.name;
    setLead(newLead);

    const lower = foldAccents(text);
    const recentBot = messages
      .filter((m) => m.from === "ai")
      .slice(-3)
      .map((m) => m.text);

    // ───── 1. Already booked? Acknowledge follow-ups gracefully.
    if (appointmentCreated) {
      if (hasBookingIntent(text) || hasConfirmation(text)) {
        pushAI(
          `Tu cita para ${appointmentCreated.treatment} sigue confirmada para ${appointmentCreated.time}. Si necesitas cambiarla, dime una nueva fecha y la muevo.`,
        );
      } else {
        pushAI(
          `Recuerda que ya tienes tu cita confirmada para ${appointmentCreated.treatment} el ${appointmentCreated.time}. ¿En qué más puedo ayudarte?`,
        );
      }
      return;
    }

    // ───── 2. All three fields collected → BOOK NOW.
    // Unconditional: if the lead is complete (name + phone + treatment),
    // the user has provided everything we need. We no longer require an
    // explicit "cita"/"reserva" word — providing all 3 IS the intent.
    // This fixes the "the bot asks for my phone again after I gave it"
    // class of bug where the booking gate failed and we fell through to
    // the catch-all that re-asked for everything.
    if (newLead.name && newLead.phone && newLead.treatment) {
      bookSimulated(newLead.name, newLead.phone, newLead.treatment);
      return;
    }

    // ───── 3. We just learned a treatment — describe it + ask only for
    // what's still missing.
    if (matched) {
      let resp = describeTreatment(matched);
      const missing = [
        !newLead.name && "tu nombre",
        !newLead.phone && "un teléfono de contacto",
      ].filter(Boolean);
      if (missing.length === 2) {
        resp += "\n\n¿Me dices tu nombre y un teléfono de contacto y te reservo una valoración previa?";
      } else if (missing.length === 1) {
        resp += `\n\n${newLead.name ? firstName(newLead.name) + ", " : ""}¿me confirmas ${missing[0]} y te lo reservo?`;
      } else {
        resp += `\n\n${firstName(newLead.name!)}, te puedo reservar mañana a las 17:00 — ¿te encaja o prefieres otra hora?`;
      }
      pushAI(resp);
      return;
    }

    // ───── 4. Booking intent + treatment missing → ask for treatment by name.
    if (hasBookingIntent(text) && !newLead.treatment) {
      const names = treatments.slice(0, 5).map((t) => t.name).join(", ");
      pushAI(
        `Claro${newLead.name ? `, ${firstName(newLead.name)}` : ""}. ¿Qué tratamiento quieres reservar? Tenemos ${names}${treatments.length > 5 ? " y más" : ""}.`,
      );
      return;
    }

    // ───── 5. They gave us a name but we don't know what they want yet.
    if (name && !newLead.treatment) {
      pushAI(
        `¡Encantada, ${firstName(name)}! ¿Sobre qué tratamiento querías información o reservar?`,
      );
      return;
    }

    // ───── 6. They gave us a phone but we don't know what they want yet.
    if (phone && !newLead.treatment) {
      pushAI(
        `¡Genial, gracias! ¿Sobre qué tratamiento querías información o reservar?`,
      );
      return;
    }

    // ───── 7. Pure-price question.
    if (lower.match(/\b(precio|precios|coste|cuesta|cuanto|tarifa)\b/)) {
      const names = treatments.slice(0, 4).map((t) => t.name).join(", ");
      pushAI(
        `Los precios varían según el tratamiento. ¿Sobre cuál te gustaría que te informe? Tenemos ${names} y más.`,
      );
      return;
    }

    // ───── 8. Greeting.
    if (lower.match(/\b(hola|buenos|buenas|hey|que tal|qué tal)\b/)) {
      pushAI(
        "¡Hola! ¿En qué tratamiento estás interesado/a? Puedo informarte de precios, duración o reservarte una valoración previa.",
      );
      return;
    }

    // ───── 9. Confirmation — covers cases like "sí" / "vale" / "ok" when
    // the user already gave us most details and the bot offered to book.
    if (hasConfirmation(text) && newLead.name && newLead.treatment) {
      // We need a phone to actually book. Ask only for that.
      if (!newLead.phone) {
        pushAI(
          `Perfecto. Para confirmar la reserva, ${firstName(newLead.name)}, ¿me das un teléfono de contacto?`,
        );
        return;
      }
      bookSimulated(newLead.name, newLead.phone, newLead.treatment);
      return;
    }

    // ───── 10. Generic fallback — but ALWAYS ask only for the fields that
    // are actually missing, never re-ask for things we already captured.
    const missing: string[] = [];
    if (!newLead.name) missing.push("tu nombre");
    if (!newLead.phone) missing.push("un teléfono de contacto");
    if (!newLead.treatment) missing.push("el tratamiento que te interesa");

    if (missing.length === 1) {
      pushAI(
        pickFresh(
          [
            `Solo necesito ${missing[0]} y te lo reservo enseguida.`,
            `Para terminar, ¿me confirmas ${missing[0]}?`,
            `Falta un detalle: ${missing[0]}. ¿Me lo pasas?`,
          ],
          recentBot,
        ),
      );
      return;
    }
    if (missing.length === 2) {
      pushAI(
        pickFresh(
          [
            `Para reservarte, necesito ${missing[0]} y ${missing[1]}.`,
            `¿Me puedes dar ${missing[0]} y ${missing[1]}? Con eso te lo reservo.`,
          ],
          recentBot,
        ),
      );
      return;
    }

    pushAI(
      pickFresh(
        [
          "Por supuesto. Para ayudarte mejor, ¿me podrías decir tu nombre, un teléfono de contacto y el tratamiento que te interesa?",
          "Claro. Cuéntame: ¿cómo te llamas, qué tratamiento te interesa y a qué número te puedo escribir?",
          "Encantada de ayudarte. Para darte la mejor info necesito tu nombre, tu teléfono y el tratamiento que buscas.",
        ],
        recentBot,
      ),
    );
  }

  function bookSimulated(name: string, phone: string, treatment: string) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(17, 0, 0, 0);
    setAppointmentCreated({
      time: date.toLocaleString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
      treatment,
      name,
    });
    const human = date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    pushAI(
      `¡Perfecto, ${firstName(name)}! He reservado tu valoración previa de ${treatment} para el ${human} a las 17:00. Te enviaré la confirmación al ${phone}. 💛`,
    );
  }

  function runRealTurn(text: string) {
    setTyping(true);
    startTransition(async () => {
      const res = await runDemoTurnAction({ message: text });
      setTyping(false);
      if (res.ok) {
        const reply = res.data.respuesta || "(el bot no respondió nada)";
        setMessages((prev) => [...prev, { from: "ai", text: reply, at: Date.now() }]);
      } else {
        setError(res.error.message);
      }
    });
  }

  function reset() {
    setMessages([initialAi]);
    setLead({});
    setInput("");
    setAppointmentCreated(null);
    setError(null);
    if (mode === "real") {
      startTransition(async () => {
        await clearDemoConversationAction();
      });
    }
  }

  function toggleMode() {
    const next = mode === "simulated" ? "real" : "simulated";
    setMode(next);
    // Reset the UI when switching modes so the two conversations don't
    // visually bleed into each other.
    setMessages([initialAi]);
    setLead({});
    setAppointmentCreated(null);
    setError(null);
    if (next === "simulated") {
      // Leaving real mode: also drop the server-side demo conversation so
      // the next time the user flips back to real mode they start clean.
      startTransition(async () => {
        await clearDemoConversationAction();
      });
    }
  }

  const suggestions = useMemo(() => {
    const sample = treatments.slice(0, 3);
    return [
      sample[0] ? `“Hola, ¿qué es ${sample[0].name}?”` : null,
      "“Me llamo Laura, mi tel es +34 600 123 456”",
      sample[1] ? `“¿Me puedes reservar una cita para ${sample[1].name}?”` : "“¿Me puedes reservar una cita?”",
    ].filter((s): s is string => s !== null);
  }, [treatments]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Chat */}
      <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-md)]">
        <header className="flex items-center justify-between gap-3 border-b border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_8px_22px_-10px_rgba(16,185,129,0.6)]">
              <Bot className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div>
              <p className="font-bold text-[color:var(--color-ink-900)]">
                Asistente · {clinicName}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {mode === "real"
                  ? "Modo real · usa la IA y consume créditos OpenAI"
                  : "Modo simulado · respuesta local sin coste"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant={mode === "real" ? "primary" : "outline"}
              size="sm"
              onClick={toggleMode}
              title={
                mode === "real"
                  ? "Cambiar a modo simulado (sin coste)"
                  : "Cambiar a modo real (consume tokens OpenAI)"
              }
            >
              <Zap className="h-4 w-4" /> {mode === "real" ? "Modo real" : "Activar real"}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw /> Reiniciar
            </Button>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto bg-[color:var(--color-surface-2)] p-6"
        >
          {messages.map((m, i) => {
            const isClient = m.from === "client";
            return (
              <div key={i} className={cn("flex", isClient ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    isClient
                      ? "rounded-tr-md bg-gradient-to-br from-[#25d366] via-[#14b87a] to-[#0d9488] text-[color:var(--color-ink-900)] shadow-[0_8px_22px_-10px_rgba(13,148,136,0.5)]"
                      : "rounded-tl-md bg-white text-[color:var(--color-ink-800)] ring-1 ring-[color:var(--color-ink-100)]",
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex">
              <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-[color:var(--color-ink-100)]">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--color-ink-300)]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--color-ink-300)] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--color-ink-300)] [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mx-3 mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-[color:var(--color-ink-100)] bg-white p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "real"
                ? "Escribe — la respuesta sale del bot real…"
                : "Escribe como si fueras un cliente…"
            }
            className="flex-1"
            disabled={typing && mode === "real"}
          />
          <Button type="submit" variant="accent" size="icon" disabled={typing && mode === "real"}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--color-ink-100)] bg-gradient-to-br from-[color:var(--color-brand-50)] to-white px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-700)]">
              <Database className="h-3.5 w-3.5" /> Datos capturados
            </p>
            <Badge variant="success">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              En vivo
            </Badge>
          </div>
          <div className="space-y-2.5 p-5">
            <Field label="Nombre" value={lead.name} icon={User} />
            <Field label="Teléfono" value={lead.phone} icon={Phone} />
            <Field label="Email" value={lead.email} icon={Mail} />
            <Field label="Tratamiento" value={lead.treatment} icon={Sparkles} highlighted />
          </div>
          {(lead.name || lead.phone || lead.treatment) && (
            <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
              <CheckCircle2 className="h-4 w-4" /> Guardado automáticamente en el CRM
            </div>
          )}
        </div>

        {appointmentCreated && (
          <div className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-[var(--shadow-sm)]">
            <Badge variant="success">
              <Calendar className="h-3 w-3" /> Cita creada
            </Badge>
            <p className="mt-3 font-black tracking-tight text-emerald-900">
              Valoración previa · {appointmentCreated.treatment}
            </p>
            <p className="text-sm font-semibold text-emerald-800">{appointmentCreated.name}</p>
            <p className="mt-1 text-xs text-emerald-700">{appointmentCreated.time}</p>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sincronizada con Google Calendar
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-[#f5f3ff] via-[#e6f4f1] to-[#effdf6] p-5 shadow-[var(--shadow-sm)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-2xl"
            style={{
              background: "radial-gradient(circle, rgba(13,148,136,0.4) 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-coral-500)]">
              <Sparkles className="h-3.5 w-3.5" /> Prueba a escribir
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--color-ink-700)]">
              {suggestions.map((s) => (
                <li
                  key={s}
                  className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 backdrop-blur"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
  highlighted,
}: {
  label: string;
  value?: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition",
        value
          ? highlighted
            ? "border-[color:var(--color-brand-200)] bg-[color:var(--color-brand-50)]/70"
            : "border-[color:var(--color-ink-100)] bg-white"
          : "border-dashed border-[color:var(--color-ink-200)] bg-[color:var(--color-surface-1)]",
      )}
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-ink-500)]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          "text-right text-sm",
          value
            ? highlighted
              ? "font-bold text-[color:var(--color-brand-700)]"
              : "font-bold text-[color:var(--color-ink-900)]"
            : "font-medium text-[color:var(--color-ink-300)]",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}
