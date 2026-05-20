"use client";

import { Calendar, MessageCircle, Globe } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/brand/social-icons";
import { useOnboarding } from "@/lib/store/onboarding-store";
import { StepNav } from "@/components/onboarding/step-nav";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const CHANNELS = [
  {
    key: "whatsapp" as const,
    icon: MessageCircle,
    name: "WhatsApp Business",
    desc: "Captura leads y reserva citas desde WhatsApp en automático.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    key: "instagram" as const,
    icon: InstagramIcon,
    name: "Instagram Direct",
    desc: "Responde DMs y guarda los contactos directamente en el CRM.",
    color: "text-pink-600 bg-pink-50",
  },
  {
    key: "facebook" as const,
    icon: FacebookIcon,
    name: "Facebook Messenger",
    desc: "Centraliza mensajes y leads desde la página de Facebook.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    key: "webForm" as const,
    icon: Globe,
    name: "Formularios web",
    desc: "Embed o pop-up para capturar leads desde tu sitio web.",
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    key: "googleCalendar" as const,
    icon: Calendar,
    name: "Google Calendar",
    desc: "Sincroniza la agenda y mantén la disponibilidad real en tiempo real.",
    color: "text-amber-600 bg-amber-50",
  },
];

export function StepChannels() {
  const channels = useOnboarding((s) => s.channels);
  const setChannels = useOnboarding((s) => s.setChannels);

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-3 md:grid-cols-2">
        {CHANNELS.map((c) => {
          const active = channels[c.key];
          const Icon = c.icon;
          return (
            <label
              key={c.key}
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-all",
                active
                  ? "border-[color:var(--color-ink-900)] bg-[color:var(--color-ink-50)]"
                  : "border-[color:var(--color-ink-100)] bg-white hover:border-[color:var(--color-ink-300)]",
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  c.color,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-[color:var(--color-ink-500)]">{c.desc}</p>
              </div>
              <Checkbox
                checked={active}
                onCheckedChange={(v) => setChannels({ [c.key]: v })}
              />
            </label>
          );
        })}
      </div>

      <p className="text-xs text-[color:var(--color-ink-500)]">
        Podrás conectar las credenciales reales en el panel del CRM. Aquí solo decides
        cuáles activar.
      </p>

      <StepNav current={7} />
    </div>
  );
}
