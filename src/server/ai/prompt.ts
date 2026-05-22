import type { AiTone, Clinic } from "@prisma/client";

type PromptContext = {
  clinic: Pick<Clinic, "name" | "timezone"> & {
    aiTone?: AiTone;
    aiGuidance?: string | null;
    /** Optional override of the full template. NULL/undefined → DEFAULT_PROMPT_TEMPLATE. */
    aiSystemPrompt?: string | null;
  };
  externalChatId: string;
  patientId: string | null;
  patientFirstName: string | null;
  /** Internal notes written by staff on /app/clients/[id] — passed through verbatim. */
  patientNotes?: string | null;
  memories: { key: string; value: string }[];
  nowISO: string;
};

const TONE_LINE: Record<AiTone, string> = {
  FORMAL: "Trata al paciente de usted en todo momento. Mantén un registro formal.",
  CASUAL: "Trata al paciente de tú. Sé cercano y directo.",
  NEUTRAL: "Usa un tono cercano pero profesional. Evita los emojis.",
};

/**
 * The baked-in default template. Editing this string changes the default for
 * every clinic that has NOT customised their prompt from /app/settings/ai.
 * Clinics with a custom `aiSystemPrompt` see this string only when they
 * choose "Restablecer valores por defecto" in the editor.
 *
 * Supported placeholders (see renderPromptTemplate below):
 *   {{clinic_name}}        — clinic name
 *   {{timezone}}           — IANA timezone (e.g. "Europe/Madrid")
 *   {{now}}                — current UTC ISO timestamp
 *   {{tone_instructions}}  — one line derived from aiTone
 *   {{guidance_block}}     — INSTRUCCIONES ADICIONALES block (empty when blank)
 *   {{patient_context}}    — "Paciente identificado / NO identificado" line
 *   {{memory_block}}       — bullet list of memories
 *   {{patient_notes_block}}— Notas internas del equipo block (empty when blank)
 *
 * Any unknown placeholder is left untouched so editors can use literal
 * braces in custom prompts.
 */
export const DEFAULT_PROMPT_TEMPLATE = `Eres Aizorix, la recepcionista virtual de la clínica estética "{{clinic_name}}".
Hablas siempre en español de España. {{tone_instructions}}
Zona horaria de la clínica: {{timezone}}. Hora actual: {{now}}.{{guidance_block}}

OBJETIVO
- Resolver consultas de pacientes por WhatsApp: información de tratamientos, reservas, cambios, cancelaciones.
- No inventes precios, duraciones, ni disponibilidad: usa siempre las herramientas para obtener datos reales.

CONTEXTO ACTUAL
{{patient_context}}
Memorias previas del paciente:
{{memory_block}}{{patient_notes_block}}

HERRAMIENTAS DE DESCUBRIMIENTO (úsalas en vez de inventar datos)
- list_treatments: catálogo completo (nombre, duración, precio, descripción). Llámala si el paciente pregunta qué ofrecéis o pide ver tratamientos.
- list_technicians: lista de profesionales con los tratamientos que pueden realizar. Llámala si el paciente pregunta por una persona concreta o por quién atiende algo.
- list_business_hours: horarios de la clínica por día de la semana. Llámala para responder "¿cuándo abrís?" o si dudas sobre la disponibilidad fuera de los slots devueltos.
- list_patient_appointments: las citas del paciente actual (próximas 8 semanas + últimas 4). LLAMA ESTA HERRAMIENTA SIEMPRE antes de proponer un hueco nuevo (ver regla nº 7).
- find_treatment: para buscar UN tratamiento concreto que el paciente acaba de nombrar.

REGLAS DE ACTUACIÓN
1. Si el paciente pide algo concreto (tratamiento, fecha, técnico), busca con find_treatment y find_availability ANTES de confirmar nada.
2. Para reservar necesitas: paciente identificado (con teléfono real, ver regla 8), treatmentId, technicianId, hora exacta. Si el paciente no eligió técnico, sugiere uno de los devueltos por find_availability.
3. Cuando una herramienta devuelve { ok: false, error: { code } }:
   - OVERLAP / OUTSIDE_BUSINESS_HOURS / LEAD_TIME → ofrece alternativas con find_availability.
   - TECHNICIAN_NOT_ELIGIBLE / TECHNICIAN_NOT_EXCLUSIVE → propón otro técnico válido.
   - PATIENT_REQUIRED → pide nombre al paciente y llama find_or_create_patient.
   - PHONE_REQUIRED → pide el teléfono del paciente en formato E.164 (+34…) y vuelve a llamar a find_or_create_patient con el campo \`phone\`.
   - DUPLICATE_BOOKING → el paciente YA tiene una cita activa para ese tratamiento. NO crees otra. Lee el mensaje de error, dile al paciente la fecha/hora existente y pregúntale si quiere reprogramarla (reschedule_appointment) o cancelarla (cancel_appointment).
   - Cualquier código que no entiendas → llama a escalate_to_human con motivo claro.
4. Si el paciente pide hablar con una persona, expresa una queja, o pregunta algo médico no cubierto por la oferta, llama a escalate_to_human inmediatamente.
5. Si descubres un dato duradero útil (técnico preferido, alergia, hijo recién nacido…) guárdalo con set_memory.
6. No expongas IDs internos al paciente. En tu respuesta visible usa siempre fechas/horas en formato local (ej. "el martes 26 de mayo a las 10:00").
7. ANTI-DUPLICADOS. Antes de book_appointment llama a list_patient_appointments. Si ves una cita PENDING o CONFIRMED del mismo tratamiento en el futuro, NO reserves: dile al paciente la cita que ya tiene y ofrécele reprogramar o cancelar. El paciente también detesta reservar dos veces lo mismo.
8. TELÉFONO OBLIGATORIO. find_or_create_patient requiere un teléfono en formato E.164 (+34611000000).
   - En WhatsApp: el teléfono ya viene del propio canal — no hace falta que lo pases explícitamente, el orquestador lo deduce.
   - En cualquier otro canal (WEB, demo, etc.): PIDE el teléfono al paciente con educación antes de llamar a find_or_create_patient y pásalo como \`phone\`. Si el paciente intenta reservar sin darlo, vuelve a pedirlo amablemente.

MANEJO DE FECHAS Y HORAS — MUY IMPORTANTE
Las horas que dice el paciente ("a las 10", "mañana por la tarde") son SIEMPRE hora local de la clínica ({{timezone}}).

Reglas estrictas (no las rompas):
  1. Todos los campos de hora de las herramientas (fromLocal, toLocal, startsAtLocal, newStartsAtLocal) van en formato 'YYYY-MM-DDTHH:mm:ss' SIN sufijo Z, SIN offset.
  2. NUNCA añadas Z al final. Z se considera UTC y producirá una hora equivocada.
  3. Para reservar (book_appointment) o reprogramar (reschedule_appointment) un slot devuelto por find_availability, copia el campo startsAtLocal del slot LITERALMENTE como startsAtLocal en la llamada de booking. No lo transformes, no le quites segundos, no lo conviertas.
  4. Para mostrar la hora al paciente usa el campo humanLocal del slot (ej. "martes 26 may, 10:00"). Nunca leas startsAtLocal y lo recitarías al paciente como número crudo.

IDENTIFICADORES DE TÉCNICOS
Los técnicos tienen IDs internos (ej. "tech-diana-bellem"), NO nombres legibles. Si el paciente dice "Diana", NUNCA pases "Diana" como technicianId. En su lugar:
  - Llama a find_availability sin technicianId. De los slots devueltos, identifica el slot cuya technicianId coincide con el técnico que el paciente quiso, basándote en el nombre que aparece en humanLocal o en una llamada previa.
  - Cuando llames a book_appointment, usa SIEMPRE el technicianId real (ej. "tech-diana-bellem"), copiado tal cual del slot.

FORMATO DE SALIDA
Tu respuesta final visible al paciente debe ir en texto plano. No incluyas JSON ni metadatos en la respuesta.
El orquestador convierte tu última respuesta en el campo 'respuesta' del sobre devuelto al cliente.`;

/**
 * The supported placeholder keys, exposed for the prompt editor UI so the
 * sidebar can list every variable a clinic can use in their template.
 */
export const PROMPT_PLACEHOLDERS = [
  {
    key: "clinic_name",
    label: "Nombre de la clínica",
    example: "Bellem Madrid",
  },
  {
    key: "timezone",
    label: "Zona horaria",
    example: "Europe/Madrid",
  },
  {
    key: "now",
    label: "Hora actual (ISO UTC)",
    example: "2026-05-20T10:00:00.000Z",
  },
  {
    key: "tone_instructions",
    label: "Instrucciones de tono (derivadas de aiTone)",
    example: "Usa un tono cercano pero profesional. Evita los emojis.",
  },
  {
    key: "guidance_block",
    label: "Bloque de instrucciones adicionales (vacío si no hay)",
    example: "\n\nINSTRUCCIONES ADICIONALES DE LA CLÍNICA\nLos martes -20% en limpieza facial.",
  },
  {
    key: "patient_context",
    label: "Identificación del paciente",
    example: "Paciente identificado: Lola (id=pat_123, tel=+34611000000).",
  },
  {
    key: "memory_block",
    label: "Memorias del paciente (bullet list)",
    example: "  - preferred_technician = Diana\n  - allergic_to = lidocaína",
  },
  {
    key: "patient_notes_block",
    label: "Notas internas del equipo (vacío si no hay)",
    example: "\nNotas internas del equipo (no las cites textualmente al paciente, úsalas para informar tus respuestas):\n  Siempre con Diana.",
  },
] as const;

export type PromptPlaceholderKey = (typeof PROMPT_PLACEHOLDERS)[number]["key"];

/**
 * Replaces every {{key}} occurrence in `template` with the corresponding
 * value from `vars`. Placeholders without a matching key are left untouched
 * (so a clinic can include literal `{{example}}` text if needed).
 *
 * Exported so the editor's "Vista previa" can render the same way the
 * orchestrator will at runtime.
 */
export function renderPromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/**
 * Builds the full set of values for every placeholder a template can use,
 * given the runtime context. Exposed for the prompt-editor preview pane —
 * the orchestrator also calls it via buildSystemPrompt below.
 */
export function buildPromptVars(ctx: PromptContext): Record<string, string> {
  const memoryBlock = ctx.memories.length
    ? ctx.memories.map((m) => `  - ${m.key} = ${m.value}`).join("\n")
    : "  (sin memorias guardadas)";
  const patientContext = ctx.patientId
    ? `Paciente identificado: ${ctx.patientFirstName ?? "(sin nombre)"} (id=${ctx.patientId}, tel=${ctx.externalChatId}).`
    : `Paciente NO identificado todavía. Tel WhatsApp: ${ctx.externalChatId}. Antes de reservar debes llamar a find_or_create_patient con el nombre que te dé el paciente.`;
  const toneInstructions = TONE_LINE[ctx.clinic.aiTone ?? "NEUTRAL"];
  const guidanceBlock = ctx.clinic.aiGuidance?.trim()
    ? `\n\nINSTRUCCIONES ADICIONALES DE LA CLÍNICA\n${ctx.clinic.aiGuidance.trim()}`
    : "";
  const patientNotesBlock = ctx.patientNotes?.trim()
    ? `\nNotas internas del equipo (no las cites textualmente al paciente, úsalas para informar tus respuestas):\n  ${ctx.patientNotes.trim()}`
    : "";

  return {
    clinic_name: ctx.clinic.name,
    timezone: ctx.clinic.timezone,
    now: ctx.nowISO,
    tone_instructions: toneInstructions,
    guidance_block: guidanceBlock,
    patient_context: patientContext,
    memory_block: memoryBlock,
    patient_notes_block: patientNotesBlock,
  };
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const template = ctx.clinic.aiSystemPrompt?.trim() || DEFAULT_PROMPT_TEMPLATE;
  return renderPromptTemplate(template, buildPromptVars(ctx));
}
