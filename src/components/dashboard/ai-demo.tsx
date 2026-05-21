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

function foldAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function detectTreatment(text: string, treatments: DemoTreatment[]): DemoTreatment | undefined {
  const t = foldAccents(text);
  for (const tr of treatments) {
    const slug = foldAccents(tr.slug);
    const name = foldAccents(tr.name);
    if (slug && t.includes(slug)) return tr;
    if (name && t.includes(name)) return tr;
  }
  return undefined;
}

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

function extractPhone(text: string) {
  const m = text.match(/(\+?\d[\d\s]{7,}\d)/);
  return m?.[1]?.replace(/\s+/g, " ");
}
function extractEmail(text: string) {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m?.[0];
}
function extractName(text: string) {
  const m = text.match(/me llamo ([\p{L} ]+)/iu) || text.match(/soy ([\p{L} ]+)/iu);
  return m?.[1]?.trim();
}

export function AiDemo({
  clinicName,
  treatments,
}: {
  clinicName: string;
  treatments: DemoTreatment[];
}) {
  const initialAi = useMemo<Msg>(
    () => ({
      from: "ai",
      text: `¡Hola! 👋 Bienvenido/a a ${clinicName}. Soy la asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?`,
      at: Date.now(),
    }),
    [clinicName],
  );

  const [messages, setMessages] = useState<Msg[]>([initialAi]);
  const [lead, setLead] = useState<CapturedLead>({});
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [mode, setMode] = useState<"simulated" | "real">("simulated");
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

    const newLead = { ...lead };
    const phone = extractPhone(text);
    if (phone && !newLead.phone) newLead.phone = phone;
    const email = extractEmail(text);
    if (email && !newLead.email) newLead.email = email;
    const name = extractName(text);
    if (name && !newLead.name) newLead.name = name;
    const matched = detectTreatment(text, treatments);
    if (matched && !newLead.treatment) newLead.treatment = matched.name;
    setLead(newLead);

    const lower = foldAccents(text);

    if (
      lower.match(/(reserv|cita|agendar|hora)/) &&
      newLead.treatment &&
      newLead.name &&
      newLead.phone
    ) {
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
        treatment: newLead.treatment,
        name: newLead.name,
      });
      pushAI(
        `¡Perfecto, ${newLead.name.split(" ")[0]}! He reservado una valoración previa para ${newLead.treatment} el ${date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las 17:00. Te he enviado la confirmación por WhatsApp. ¡Te esperamos! 💛`,
      );
      return;
    }

    if (matched) {
      let resp = describeTreatment(matched);
      if (!newLead.name) {
        resp +=
          "\n\n¿Me dices tu nombre y un teléfono de contacto para reservarte la valoración previa?";
      } else if (!newLead.phone) {
        resp += `\n\n${newLead.name.split(" ")[0]}, ¿me confirmas un teléfono de contacto para enviarte la confirmación?`;
      } else {
        resp += "\n\n¿Te encaja mañana por la tarde a las 17:00 o prefieres otro día?";
      }
      pushAI(resp);
      return;
    }

    if (name && !newLead.phone) {
      pushAI(`¡Encantada, ${name.split(" ")[0]}! ¿Sobre qué tratamiento querías información?`);
      return;
    }

    if (phone && !newLead.treatment) {
      pushAI("¡Genial, gracias! ¿Sobre qué tratamiento querías información o reservar?");
      return;
    }

    if (lower.match(/(precio|coste|cuanto|cuanto vale)/)) {
      const names = treatments.slice(0, 4).map((t) => t.name).join(", ");
      pushAI(
        `Los precios varían según el tratamiento. ¿Sobre cuál te gustaría que te informe? Tenemos ${names} y más.`,
      );
      return;
    }

    if (lower.match(/(hola|buenos|buenas)/)) {
      pushAI(
        "¡Hola! ¿En qué tratamiento estás interesado/a? Puedo informarte de precios, duración o reservarte una valoración previa.",
      );
      return;
    }

    pushAI(
      "Por supuesto. Para ayudarte mejor, ¿me podrías decir tu nombre, un teléfono de contacto y el tratamiento que te interesa?",
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
                      ? "rounded-tr-md bg-gradient-to-br from-[#ffd24a] via-[#f5c842] to-[#ff8a5b] text-[color:var(--color-ink-900)] shadow-[0_8px_22px_-10px_rgba(255,138,91,0.5)]"
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

        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-[#f5f3ff] via-[#fff5f1] to-[#fffaeb] p-5 shadow-[var(--shadow-sm)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-2xl"
            style={{
              background: "radial-gradient(circle, rgba(255,138,91,0.4) 0%, transparent 60%)",
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
