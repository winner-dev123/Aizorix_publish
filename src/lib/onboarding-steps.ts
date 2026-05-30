export interface OnboardingStep {
  num: number;
  slug: string;
  /** Full title for the step header (e.g. "Servicios y agenda"). */
  label: string;
  /** Short label for the progress timeline (e.g. "Servicios y agenda"). */
  short: string;
  /** Word(s) inside `label` to render with the violet gradient highlight. */
  highlight?: string;
  description: string;
}

/**
 * Onboarding flow — 5 steps, matching the Aizorix AI reference mocks:
 *
 *   1. Tu negocio          ─ business profile (name, sector, location, …)
 *   2. Servicios y agenda  ─ treatments + business hours
 *   3. Conecta canales     ─ WhatsApp, Instagram, Facebook, Forms, GCal, web
 *   4. Entrena tu IA       ─ document upload + tone/instructions
 *   5. Activa tu sistema   ─ review + "Activar mi sistema" CTA
 *
 * Legacy step components (sector, sedes, empleados, modulos, leads,
 * estados, automatizaciones, crm) are kept on disk for reuse but are no
 * longer part of the active flow.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    num: 1,
    slug: "negocio",
    label: "Tu negocio",
    short: "Tu negocio",
    highlight: "negocio",
    description:
      "Cuéntanos quién eres: nombre, sector, ubicación, contacto, sedes y empleados. Configuraremos tu plataforma con módulos específicos para tu actividad.",
  },
  {
    num: 2,
    slug: "servicios-y-agenda",
    label: "Servicios y agenda",
    short: "Servicios y agenda",
    highlight: "agenda",
    description:
      "Añade tus tratamientos, precios, duración y configura tus horarios de atención (incluidos turnos partidos).",
  },
  {
    num: 3,
    slug: "canales",
    label: "Conecta canales",
    short: "Conecta canales",
    highlight: "canales",
    description:
      "Conecta los canales que usarás para comunicarte con tus clientes: WhatsApp, Instagram, Facebook, formularios web y Google Calendar.",
  },
  {
    num: 4,
    slug: "ia",
    label: "Entrena tu IA",
    short: "Entrena tu IA",
    highlight: "tu IA",
    description:
      "Sube documentos y configura cómo debe comportarse tu asistente de IA — tono, idioma e instrucciones específicas.",
  },
  {
    num: 5,
    slug: "activar",
    label: "Activa tu sistema",
    short: "Activa tu sistema",
    highlight: "tu sistema",
    description:
      "Revisa tu configuración y activa el sistema. ¡Ya casi estás listo!",
  },
];

export function getStep(num: number) {
  return ONBOARDING_STEPS.find((s) => s.num === num);
}

export function getStepBySlug(slug: string) {
  return ONBOARDING_STEPS.find((s) => s.slug === slug);
}

/**
 * Map a step slug to the matching key inside `dictionary.onboarding.steps`.
 * Kept as a separate map so the i18n dictionary can use camelCase keys while
 * the URL slugs stay kebab-case / shorter for nice routes.
 *
 * Returns `null` for slugs that are not in the active flow (e.g. legacy
 * `crm` / `automatizaciones` step components that still exist on disk),
 * letting callers fall back to the hardcoded step record.
 */
const STEP_DICT_KEYS = {
  negocio: "negocio",
  "servicios-y-agenda": "serviciosYAgenda",
  canales: "canales",
  ia: "ia",
  activar: "activar",
} as const satisfies Record<string, string>;

export type StepDictKey = (typeof STEP_DICT_KEYS)[keyof typeof STEP_DICT_KEYS];

export function getStepDictKey(slug: string): StepDictKey | null {
  return (STEP_DICT_KEYS as Record<string, StepDictKey>)[slug] ?? null;
}
