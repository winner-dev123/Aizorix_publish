"use client";

import { Bell, Cake, HeartHandshake, Megaphone, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { StepNav } from "@/components/onboarding/step-nav";

const AUTOMATIONS = [
  {
    id: "reminders",
    icon: Bell,
    name: "Recordatorios de cita",
    desc: "Envía un recordatorio 24h y 1h antes de la cita.",
    enabled: true,
  },
  {
    id: "follow-up",
    icon: HeartHandshake,
    name: "Seguimiento post-tratamiento",
    desc: "Mensaje automático 2 días después de un tratamiento.",
    enabled: true,
  },
  {
    id: "recovery",
    icon: RefreshCw,
    name: "Recuperación de inactivos",
    desc: "Reactivación automática de clientes sin visita en 3, 6 y 12 meses.",
    enabled: true,
  },
  {
    id: "birthdays",
    icon: Cake,
    name: "Cumpleaños automáticos",
    desc: "Felicitación con descuento personalizado el día del cumple.",
    enabled: false,
  },
  {
    id: "campaigns",
    icon: Megaphone,
    name: "Campañas estacionales",
    desc: "Promociones automáticas en fechas clave (verano, Black Friday…).",
    enabled: false,
  },
];

export function StepAutomations() {
  const [enabled, setEnabled] = useState(
    AUTOMATIONS.reduce<Record<string, boolean>>((acc, a) => {
      acc[a.id] = a.enabled;
      return acc;
    }, {}),
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-3">
        {AUTOMATIONS.map((a) => {
          const Icon = a.icon;
          return (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-4 rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--color-ink-50)] text-[color:var(--color-ink-700)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-[color:var(--color-ink-500)]">{a.desc}</p>
              </div>
              <Checkbox
                checked={enabled[a.id]}
                onCheckedChange={(v) => setEnabled({ ...enabled, [a.id]: v })}
              />
            </label>
          );
        })}
      </div>

      <p className="text-xs text-[color:var(--color-ink-500)]">
        Estas reglas pueden modificarse en cualquier momento desde el panel del CRM.
      </p>

      <StepNav current={13} />
    </div>
  );
}
