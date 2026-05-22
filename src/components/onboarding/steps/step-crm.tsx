"use client";

import Link from "next/link";
import { BarChart3, KanbanSquare, MessagesSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNav } from "@/components/onboarding/step-nav";

const HIGHLIGHTS = [
  {
    icon: KanbanSquare,
    title: "Pipeline visual",
    text: "Mueve clientes entre estados arrastrando tarjetas.",
  },
  {
    icon: Users,
    title: "Ficha completa",
    text: "Historial, conversaciones, citas y notas en un solo lugar.",
  },
  {
    icon: MessagesSquare,
    title: "Bandeja unificada",
    text: "WhatsApp, Instagram y Facebook centralizados.",
  },
  {
    icon: BarChart3,
    title: "Métricas",
    text: "Conversión, ingresos estimados y rendimiento por sede.",
  },
];

export function StepCRM() {
  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-3 md:grid-cols-2">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.title}
            className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br from-white to-[color:var(--color-surface-1)] p-5 card-hover"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#25d366] to-[#0d9488] text-[color:var(--color-ink-900)] shadow-[0_6px_14px_-6px_rgba(13,148,136,0.4)]">
              <h.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{h.title}</p>
              <p className="text-sm text-[color:var(--color-ink-500)]">{h.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-5 text-sm">
        Tu CRM ya está casi listo. Antes de activarlo, te mostramos las
        automatizaciones que se pondrán en marcha.
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/app">Echar un vistazo al CRM →</Link>
          </Button>
        </div>
      </div>

      <StepNav current={12} />
    </div>
  );
}
