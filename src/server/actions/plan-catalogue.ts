/**
 * Plan-tier metadata shown on /app/settings/facturacion. Plain module —
 * the actual plan value is read-only on the dashboard side, mutated by
 * the platform owner directly in the DB or via the create:clinic CLI.
 *
 * Numbers are illustrative; tweak when real pricing lands.
 */

import type { ClinicPlan } from "@prisma/client";

export type PlanInfo = {
  key: ClinicPlan;
  name: string;
  monthlyEUR: number;
  description: string;
  features: string[];
};

export const PLAN_CATALOGUE: Record<ClinicPlan, PlanInfo> = {
  FREE: {
    key: "FREE",
    name: "Free",
    monthlyEUR: 0,
    description: "Para probar la plataforma con un canal y un equipo pequeño.",
    features: [
      "1 canal de WhatsApp",
      "Hasta 100 mensajes/mes",
      "Hasta 2 empleados",
      "Dashboard básico",
    ],
  },
  BASIC: {
    key: "BASIC",
    name: "Basic",
    monthlyEUR: 49,
    description: "Para clínicas que empiezan a automatizar la recepción.",
    features: [
      "1 canal de WhatsApp",
      "Hasta 1.000 mensajes/mes",
      "Hasta 5 empleados",
      "Pipeline + agenda",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    monthlyEUR: 149,
    description: "La opción recomendada — automatización completa con métricas.",
    features: [
      "1 canal de WhatsApp",
      "Mensajes ilimitados (consumo OpenAI por separado)",
      "Empleados ilimitados",
      "Pipeline · Agenda · Métricas · Campañas IA",
      "Configuración avanzada del bot",
    ],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    monthlyEUR: 0, // negotiated
    description: "Multi-sede, SLA dedicado y onboarding asistido.",
    features: [
      "Multi-clínica con dashboard agregado",
      "SLA + soporte prioritario",
      "Integraciones a medida",
      "Auditoría de tooling de IA",
    ],
  },
};
