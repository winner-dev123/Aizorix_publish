"use client";

import { useMemo, useState } from "react";
import {
  Cake,
  Gift,
  HeartHandshake,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatEUR, formatNumber, cn } from "@/lib/utils";
import type { CampaignAudience, CampaignTemplateId } from "@/server/dashboard/queries";

const WHATSAPP_PRICE = 0.018;
const CONV_LOW = 0.12;
const CONV_HIGH = 0.18;
const AVG_TICKET_LOW = 80;
const AVG_TICKET_HIGH = 220;

type CampaignTemplate = {
  id: CampaignTemplateId;
  name: string;
  icon: typeof Megaphone;
  description: string;
  defaultMessage: string;
  tone: string;
};

const TEMPLATES: CampaignTemplate[] = [
  {
    id: "recovery-6m",
    name: "Recuperación · inactivos 6m",
    icon: RefreshCw,
    description: "Reactivar clientes que no han venido en los últimos 6 meses con promoción.",
    defaultMessage:
      "Hola {{nombre}}, te echamos de menos en la clínica 💛 Esta semana tienes -20% en tu próximo tratamiento. ¿Quieres que te reserve un hueco?",
    tone: "from-rose-100 to-rose-50",
  },
  {
    id: "vip-launch",
    name: "VIP · nuevo tratamiento",
    icon: Star,
    description: "Anunciar un nuevo servicio solo a tus clientes VIP (5+ tratamientos).",
    defaultMessage:
      "Hola {{nombre}}, queremos que seas la primera/o en probar nuestro nuevo tratamiento. Reserva exclusiva para clientes VIP esta semana.",
    tone: "from-amber-100 to-amber-50",
  },
  {
    id: "post-treatment",
    name: "Post-tratamiento · seguimiento",
    icon: HeartHandshake,
    description: "Mensaje a quien ha tenido un tratamiento en los últimos 7 días.",
    defaultMessage:
      "Hola {{nombre}}, esperamos que estés disfrutando los resultados de tu último tratamiento. ¿Qué tal todo? ¿Nos dejarías una reseña?",
    tone: "from-emerald-100 to-emerald-50",
  },
  {
    id: "lips-promo",
    name: "Promo · interesados labios",
    icon: Sparkles,
    description: "Pacientes con notas/origen que mencionan «labios».",
    defaultMessage:
      "Hola {{nombre}}, esta semana tenemos sesión especial de relleno de labios con un 15% de descuento. ¿Te reservo?",
    tone: "from-violet-100 to-violet-50",
  },
  {
    id: "birthdays",
    name: "Cumpleaños del mes",
    icon: Cake,
    description: "Pacientes cuya fecha de nacimiento cae este mes.",
    defaultMessage: "🎉 ¡Feliz cumpleaños, {{nombre}}! Tienes un regalo esperándote: 30% en tu próximo tratamiento.",
    tone: "from-sky-100 to-sky-50",
  },
  {
    id: "no-reservation",
    name: "Leads · interesados sin reserva",
    icon: Gift,
    description: "Leads con conversaciones pero sin citas reservadas.",
    defaultMessage:
      "Hola {{nombre}}, te quedó pendiente la valoración previa. ¿Quieres que te proponga un hueco esta semana?",
    tone: "from-indigo-100 to-indigo-50",
  },
];

export function CampaignsView({ audience }: { audience: CampaignAudience }) {
  const [templateId, setTemplateId] = useState<CampaignTemplateId>(TEMPLATES[0].id);
  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const [message, setMessage] = useState(template.defaultMessage);

  const realCount = audience.templates[templateId];

  const cost = realCount * WHATSAPP_PRICE;
  const convLow = Math.round(realCount * CONV_LOW);
  const convHigh = Math.round(realCount * CONV_HIGH);
  const revenueLow = convLow * AVG_TICKET_LOW;
  const revenueHigh = convHigh * AVG_TICKET_HIGH;

  // Segment percentages = share of total clinic patients (capped at 100%).
  const pct = useMemo(() => {
    const total = Math.max(audience.totalPatients, 1);
    const to = (n: number) => Math.min(100, Math.round((n / total) * 100));
    return {
      recurrentes: to(audience.segments.recurrentes),
      inactivos6m: to(audience.segments.inactivos6m),
      vip: to(audience.segments.vip),
      nuevos: to(audience.segments.nuevos),
    };
  }, [audience]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              Plantillas de campaña
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const active = t.id === templateId;
              const count = audience.templates[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTemplateId(t.id);
                    setMessage(t.defaultMessage);
                  }}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all",
                    active
                      ? "border-[color:var(--color-brand-300)] bg-gradient-to-br from-[#effdf6] via-[#e6f4f1] to-white shadow-[0_14px_36px_-14px_rgba(13,148,136,0.4)] ring-2 ring-[color:var(--color-brand-200)]/70 dark:bg-none dark:bg-[color:var(--color-surface-2)] dark:border-[color:var(--color-brand-400)]/50 dark:ring-[color:var(--color-brand-400)]/30"
                      : `border-[color:var(--color-ink-100)] bg-gradient-to-br ${t.tone} hover:border-[color:var(--color-ink-300)] hover:-translate-y-0.5 hover:shadow-md dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10 dark:hover:border-white/20`,
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
                        active
                          ? "bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-white"
                          : "bg-white text-[color:var(--color-ink-900)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="font-bold tracking-tight text-[color:var(--color-ink-900)]">
                      {t.name}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-snug text-[color:var(--color-ink-600)]">
                    {t.description}
                  </p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                    {formatNumber(count)} pacientes
                  </p>
                  {active && (
                    <span className="absolute right-3 top-3 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                      Activa
                    </span>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mensaje WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            <p className="text-xs text-[color:var(--color-ink-500)]">
              Variables:{" "}
              <code className="rounded bg-[color:var(--color-ink-100)] px-1.5 py-0.5 font-mono text-[11px]">
                {"{{nombre}}"}
              </code>{" "}
              <code className="rounded bg-[color:var(--color-ink-100)] px-1.5 py-0.5 font-mono text-[11px]">
                {"{{tratamiento}}"}
              </code>{" "}
              <code className="rounded bg-[color:var(--color-ink-100)] px-1.5 py-0.5 font-mono text-[11px]">
                {"{{sede}}"}
              </code>
            </p>
            <div className="rounded-2xl border border-[color:var(--color-ink-100)] bg-gradient-to-br from-[color:var(--color-surface-2)] to-white p-5 dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                Vista previa · WhatsApp
              </p>
              <div className="mt-3 max-w-md rounded-2xl rounded-tl-md bg-white p-3.5 text-sm leading-relaxed text-[color:var(--color-ink-800)] shadow-sm ring-1 ring-[color:var(--color-ink-100)]">
                {message.replace("{{nombre}}", "Laura")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              Audiencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black tracking-tight text-[color:var(--color-ink-900)]">
              {formatNumber(realCount)}
            </p>
            <p className="text-xs text-[color:var(--color-ink-500)]">
              {realCount === 1 ? "paciente" : "pacientes"} en este segmento
            </p>
            <div className="mt-5 space-y-2.5">
              <SegmentBar label="Recurrentes (3+ tratamientos)" value={pct.recurrentes} color="emerald" />
              <SegmentBar label="Inactivos 6m" value={pct.inactivos6m} color="amber" />
              <SegmentBar label="VIP (5+ tratamientos)" value={pct.vip} color="violet" />
              <SegmentBar label="Nuevos (30d)" value={pct.nuevos} color="sky" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/70 bg-gradient-to-br from-[#effdf6] via-[#e6f4f1] to-[#f5f3ff] dark:bg-none dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-60 blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(13,148,136,0.45) 0%, transparent 60%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(155,140,255,0.4) 0%, transparent 60%)",
            }}
          />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[color:var(--color-ink-900)]">
              <Sparkles className="h-4 w-4 text-[color:var(--color-coral-500)]" />
              Coste e ingresos
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3 text-sm">
            <Row label="Mensajes a enviar" value={formatNumber(realCount)} />
            <Row label="Coste / mensaje" value="0,018 €" />
            <Row label="Coste total" value={formatEUR(cost)} accent />
            <div className="my-2 h-px bg-[color:var(--color-ink-200)]/60" />
            <Row
              label="Conversión IA"
              value={`${Math.round(CONV_LOW * 100)}% – ${Math.round(CONV_HIGH * 100)}%`}
            />
            <Row
              label="Citas estimadas"
              value={`${formatNumber(convLow)} – ${formatNumber(convHigh)}`}
            />

            <div className="mt-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur dark:bg-[color:var(--color-surface-2)] dark:border-white/15">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-coral-500)]">
                Ingresos potenciales
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-brand-gradient">
                {formatEUR(revenueLow)} – {formatEUR(revenueHigh)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button variant="accent" size="lg" className="w-full" disabled={realCount === 0}>
          <Send /> Lanzar campaña
        </Button>
        <p className="text-center text-xs text-[color:var(--color-ink-500)]">
          Pasa por revisión IA antes del envío. No se enviará nada sin tu confirmación.
        </p>
      </aside>
    </div>
  );
}

const COLORS: Record<string, string> = {
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-amber-600",
  violet: "from-violet-400 to-violet-600",
  sky: "from-sky-400 to-sky-600",
};

function SegmentBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: keyof typeof COLORS;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[color:var(--color-ink-700)]">{label}</span>
        <span className="font-bold text-[color:var(--color-ink-900)]">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--color-ink-100)]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${COLORS[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[color:var(--color-ink-500)]">{label}</span>
      <span
        className={cn(
          "font-bold",
          accent ? "text-[color:var(--color-coral-500)]" : "text-[color:var(--color-ink-900)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
