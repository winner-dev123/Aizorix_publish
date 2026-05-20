"use client";

import { ArrowRight, MessageCircle, Sparkles, Calendar, UserPlus } from "lucide-react";
import { StepNav } from "@/components/onboarding/step-nav";

const FLOW = [
  {
    icon: MessageCircle,
    title: "1. Llega el lead",
    text: "Por WhatsApp, Instagram, Facebook o el formulario web.",
    icon_bg: "from-[#bcb1ff] to-[#7c6cf5]",
    card_bg: "from-[#f5f3ff] to-white",
  },
  {
    icon: Sparkles,
    title: "2. La IA clasifica",
    text: "Detecta intención, tratamiento de interés y nivel de urgencia.",
    icon_bg: "from-[#ffd24a] to-[#ff8a5b]",
    card_bg: "from-[#fffaeb] to-white",
  },
  {
    icon: UserPlus,
    title: "3. Se guarda en CRM",
    text: "Crea o actualiza la ficha de cliente y registra la conversación.",
    icon_bg: "from-[#7eddb4] to-[#20bf7c]",
    card_bg: "from-[#effdf6] to-white",
  },
  {
    icon: Calendar,
    title: "4. Cierra la cita",
    text: "Propone slots reales y confirma la reserva en Google Calendar.",
    icon_bg: "from-[#8ec0ff] to-[#2f88ff]",
    card_bg: "from-[#eff7ff] to-white",
  },
];

export function StepLeads() {
  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {FLOW.map((s, idx) => (
          <div
            key={idx}
            className={`relative rounded-2xl border border-white/70 bg-gradient-to-br ${s.card_bg} p-5 shadow-[var(--shadow-xs)] ring-1 ring-[color:var(--color-ink-100)] card-hover`}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.icon_bg} text-white shadow-[0_6px_14px_-6px_rgba(28,36,64,0.3)]`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-bold tracking-tight text-[color:var(--color-ink-900)]">
              {s.title}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">{s.text}</p>
            {idx < FLOW.length - 1 && (
              <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[color:var(--color-ink-300)] lg:block" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-[#fff5f1] to-[#fffaeb] p-5 text-sm text-[color:var(--color-ink-700)] shadow-[var(--shadow-xs)]">
        Este flujo se activa automáticamente al terminar el onboarding. Puedes ajustar
        las reglas (auto-respuesta, asignación, follow-ups) desde la sección{" "}
        <strong>Automatizaciones</strong> del CRM.
      </div>

      <StepNav current={10} />
    </div>
  );
}
