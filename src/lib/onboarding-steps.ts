export interface OnboardingStep {
  num: number;
  slug: string;
  label: string;
  short: string;
  description: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    num: 1,
    slug: "sector",
    label: "Selecciona tu sector",
    short: "Sector",
    description:
      "Elige el sector que mejor se adapte a tu negocio. Esto nos permitirá configurar tu plataforma con módulos, automatizaciones y flujos específicos para tu actividad.",
  },
  {
    num: 2,
    slug: "negocio",
    label: "Datos del negocio",
    short: "Negocio",
    description:
      "Configura el nombre comercial, dirección, web, redes sociales y canales de contacto.",
  },
  {
    num: 3,
    slug: "sedes",
    label: "Configurar sedes",
    short: "Sedes",
    description:
      "Añade cada clínica o sede con su dirección, teléfono y horarios reales de apertura.",
  },
  {
    num: 4,
    slug: "empleados",
    label: "Añadir empleados",
    short: "Empleados",
    description:
      "Configura el personal, especialidades, horarios y servicios que puede realizar cada uno.",
  },
  {
    num: 5,
    slug: "servicios",
    label: "Servicios y precios",
    short: "Servicios",
    description:
      "Define tratamientos, duración, precios, condiciones y preguntas frecuentes.",
  },
  {
    num: 6,
    slug: "modulos",
    label: "Elige tus módulos",
    short: "Módulos",
    description:
      "Activa solo las funcionalidades que necesitas. Podrás añadir más módulos cuando quieras.",
  },
  {
    num: 7,
    slug: "canales",
    label: "Conecta tus canales",
    short: "Canales",
    description:
      "Conecta WhatsApp Business, Instagram, Facebook, formularios web y Google Calendar.",
  },
  {
    num: 8,
    slug: "agenda",
    label: "Configurar agenda",
    short: "Agenda",
    description:
      "Automatización de citas, control de horarios, bloqueos, confirmaciones y recordatorios.",
  },
  {
    num: 9,
    slug: "ia",
    label: "Entrenar la IA",
    short: "IA",
    description:
      "Información del negocio, tono de comunicación, servicios, promociones y límites de respuesta.",
  },
  {
    num: 10,
    slug: "leads",
    label: "Flujo automático de leads",
    short: "Leads",
    description:
      "Automatización de recepción, clasificación, seguimiento y cierre de clientes potenciales.",
  },
  {
    num: 11,
    slug: "estados",
    label: "Estados del cliente",
    short: "Estados",
    description:
      "Organización de leads según su estado dentro del proceso comercial.",
  },
  {
    num: 12,
    slug: "crm",
    label: "Tu CRM visual",
    short: "CRM",
    description:
      "Panel centralizado para gestionar clientes, conversaciones, citas, campañas y métricas.",
  },
  {
    num: 13,
    slug: "automatizaciones",
    label: "Automatizaciones",
    short: "Automatiz.",
    description:
      "Recordatorios, seguimientos, recuperación de clientes y campañas automáticas.",
  },
  {
    num: 14,
    slug: "listo",
    label: "¡Todo listo!",
    short: "Listo",
    description:
      "Activación completa del ecosistema IA + CRM + Agenda + Automatizaciones.",
  },
];

export function getStep(num: number) {
  return ONBOARDING_STEPS.find((s) => s.num === num);
}

export function getStepBySlug(slug: string) {
  return ONBOARDING_STEPS.find((s) => s.slug === slug);
}
