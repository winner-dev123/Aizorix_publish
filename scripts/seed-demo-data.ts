/**
 * Operational test data — realistic technicians + patients + appointments
 * + conversations + AI memories on top of the canonical seed.
 *
 * What you get after `npm run demo:seed`:
 *
 *   • 3 extra technicians (Carla, Sara, Paula) joining the existing
 *     Leo/Diana/Isis, mapped to treatments
 *   • 25 patients with diverse profiles (LEAD / ACTIVE / INACTIVE,
 *     multiple sources, realistic Spanish names + E.164 phones)
 *   • ~40 appointments spanning ±30 days with mix of statuses
 *   • 12 conversation threads with real-feel WhatsApp/IG/web messages,
 *     including 2 flagged as requiresHuman + 1 bot-paused
 *   • AI memories for ~10 patients (the bot's "I remember…" hints)
 *   • Audit log entries so /admin/audit shows recent activity
 *
 * Idempotency: every demo row carries a stable id (cuid-style prefix)
 * or a phone in the +349900XXXXXX range. Re-running this script wipes
 * only those rows before re-inserting — your real clinic data is safe.
 *
 * Usage:
 *   npm run demo:seed                     # adds to clinic "bellem"
 *   CLINIC_SLUG=bellem npm run demo:seed  # explicit
 */

import { prisma } from "../src/server/db";

const DEMO_PHONE_PREFIX = "+349900";
const DEMO_AUDIT_ACTOR = null; // synthetic — no User row

const SLUG = process.env.CLINIC_SLUG ?? "bellem";

/* ─────────────────────────── helpers ─────────────────────────── */

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

function daysFromNow(d: number, atHour = 10, atMinute = 0): Date {
  const t = new Date();
  t.setHours(atHour, atMinute, 0, 0);
  t.setDate(t.getDate() + d);
  return t;
}

function pick<T>(arr: readonly T[], idx: number): T {
  return arr[idx % arr.length]!;
}

/* ─────────────────────────── data sets ─────────────────────────── */

interface TechSeed {
  id: string;
  name: string;
  email: string;
  phone: string;
  color: string;
  prioritySensitive: boolean;
}

const TECHNICIANS: TechSeed[] = [
  {
    id: "demo-tech-carla",
    name: "Carla Esteban",
    email: "carla@bellem.demo",
    phone: "+34911000010",
    color: "#ec4899",
    prioritySensitive: false,
  },
  {
    id: "demo-tech-sara",
    name: "Sara Mendoza",
    email: "sara@bellem.demo",
    phone: "+34911000011",
    color: "#0ea5e9",
    prioritySensitive: false,
  },
  {
    id: "demo-tech-paula",
    name: "Paula Núñez",
    email: "paula@bellem.demo",
    phone: "+34911000012",
    color: "#f97316",
    prioritySensitive: false,
  },
];

/** Which treatments each new tech can perform. Mirrors the existing
 * Leo/Diana/Isis pattern: a `primary` flag picks the default-assigned
 * technician for that treatment. */
const TECH_TREATMENT_MAP: Array<{
  tech: string;
  treat: string;
  isPrimary?: boolean;
  isPreferred?: boolean;
}> = [
  // Carla — facial specialist
  { tech: "demo-tech-carla", treat: "limpieza-facial" },
  { tech: "demo-tech-carla", treat: "dermapen" },
  { tech: "demo-tech-carla", treat: "valoracion" },
  // Sara — láser + radiofrecuencia experta
  { tech: "demo-tech-sara", treat: "laser", isPreferred: true },
  { tech: "demo-tech-sara", treat: "radiofrecuencia" },
  { tech: "demo-tech-sara", treat: "valoracion" },
  // Paula — generalista
  { tech: "demo-tech-paula", treat: "diseno-cejas" },
  { tech: "demo-tech-paula", treat: "depilacion-hilo" },
  { tech: "demo-tech-paula", treat: "valoracion" },
];

interface PatientSeed {
  firstName: string;
  lastName: string;
  /** 0..24 — used to build a stable phone in the demo range. */
  phoneIdx: number;
  email?: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  source: string;
  notes?: string;
  /** "yyyy-mm-dd" */
  dob?: string;
  /** Days ago this patient was created. */
  createdDaysAgo: number;
}

const PATIENTS: PatientSeed[] = [
  // ACTIVE — patients with history
  { firstName: "María",   lastName: "García",     phoneIdx: 1,  email: "maria.garcia@example.com",   status: "ACTIVE",   source: "whatsapp_bot",  dob: "1988-04-12", createdDaysAgo: 180, notes: "Cliente desde mayo 2025. Prefiere citas por la mañana." },
  { firstName: "Carmen",  lastName: "López",      phoneIdx: 2,  email: "carmen.lopez@example.com",   status: "ACTIVE",   source: "instagram",     dob: "1992-09-03", createdDaysAgo: 156, notes: "Sensibilidad en zona de mejillas. Producto sin alcohol." },
  { firstName: "Ana",     lastName: "Martínez",   phoneIdx: 3,  email: "ana.martinez@example.com",   status: "ACTIVE",   source: "referral",      dob: "1985-11-21", createdDaysAgo: 142, notes: "Trae a su madre los viernes. Cliente VIP." },
  { firstName: "Laura",   lastName: "Sánchez",    phoneIdx: 4,  email: "laura.sanchez@example.com",  status: "ACTIVE",   source: "web_form",      dob: "1995-02-14", createdDaysAgo: 95,  notes: "Microblading retoque cada 6 meses." },
  { firstName: "Elena",   lastName: "Rodríguez",  phoneIdx: 5,  email: "elena.rodriguez@example.com",status: "ACTIVE",   source: "whatsapp_bot",  dob: "1990-07-08", createdDaysAgo: 84,  notes: "Bono de 5 sesiones de láser activo." },
  { firstName: "Sofía",   lastName: "Hernández",  phoneIdx: 6,  email: "sofia.h@example.com",        status: "ACTIVE",   source: "instagram",     dob: "1998-12-30", createdDaysAgo: 72 },
  { firstName: "Lucía",   lastName: "Pérez",      phoneIdx: 7,  email: "lucia.perez@example.com",    status: "ACTIVE",   source: "csv-import",    dob: "1993-05-19", createdDaysAgo: 65,  notes: "Importada desde HubSpot el 15/abr/2026." },
  { firstName: "Marta",   lastName: "Jiménez",    phoneIdx: 8,  email: "marta.j@example.com",        status: "ACTIVE",   source: "api",           dob: "1987-08-25", createdDaysAgo: 58,  notes: "Creada desde el conector externo de Pipedrive." },
  { firstName: "Patricia",lastName: "Ruiz",       phoneIdx: 9,  email: "patricia@example.com",       status: "ACTIVE",   source: "whatsapp_bot",  dob: "1991-10-04", createdDaysAgo: 51 },
  { firstName: "Cristina",lastName: "Moreno",     phoneIdx: 10, email: "cristina@example.com",       status: "ACTIVE",   source: "referral",      dob: "1989-01-17", createdDaysAgo: 45,  notes: "Recomendada por María García." },

  // LEAD — recientes, sin cita completada todavía
  { firstName: "Beatriz", lastName: "Álvarez",    phoneIdx: 11, email: "beatriz@example.com",        status: "LEAD",     source: "whatsapp_bot",  createdDaysAgo: 14 },
  { firstName: "Isabel",  lastName: "Romero",     phoneIdx: 12,                                       status: "LEAD",     source: "instagram",     createdDaysAgo: 12,  notes: "Pregunta por depilación láser." },
  { firstName: "Pilar",   lastName: "Torres",     phoneIdx: 13, email: "pilar.t@example.com",        status: "LEAD",     source: "web_form",      createdDaysAgo: 9 },
  { firstName: "Mónica",  lastName: "Domínguez",  phoneIdx: 14,                                       status: "LEAD",     source: "whatsapp_bot",  createdDaysAgo: 7,   notes: "Quiere valoración para microblading." },
  { firstName: "Silvia",  lastName: "Vázquez",    phoneIdx: 15, email: "silvia.v@example.com",       status: "LEAD",     source: "facebook",      createdDaysAgo: 5 },
  { firstName: "Andrea",  lastName: "Ramos",      phoneIdx: 16,                                       status: "LEAD",     source: "whatsapp_bot",  createdDaysAgo: 4 },
  { firstName: "Natalia", lastName: "Gil",        phoneIdx: 17, email: "natalia@example.com",        status: "LEAD",     source: "csv-import",    createdDaysAgo: 3 },
  { firstName: "Eva",     lastName: "Castro",     phoneIdx: 18,                                       status: "LEAD",     source: "whatsapp_bot",  createdDaysAgo: 2 },
  { firstName: "Inés",    lastName: "Ortega",     phoneIdx: 19, email: "ines.ortega@example.com",    status: "LEAD",     source: "instagram",     createdDaysAgo: 1 },

  // INACTIVE — clientes antiguos sin actividad reciente
  { firstName: "Raquel",  lastName: "Delgado",    phoneIdx: 20, email: "raquel.d@example.com",       status: "INACTIVE", source: "whatsapp_bot",  dob: "1982-06-11", createdDaysAgo: 320, notes: "Última cita en septiembre 2025. Campaña de recuperación pendiente." },
  { firstName: "Sara",    lastName: "Iglesias",   phoneIdx: 21,                                       status: "INACTIVE", source: "csv-import",    dob: "1979-03-28", createdDaysAgo: 270, notes: "Importada del CRM anterior. Posiblemente teléfono desactualizado." },
  { firstName: "Alicia",  lastName: "Cano",       phoneIdx: 22, email: "alicia.cano@example.com",    status: "INACTIVE", source: "referral",      dob: "1986-12-02", createdDaysAgo: 240 },
  { firstName: "Marina",  lastName: "Cabrera",    phoneIdx: 23,                                       status: "INACTIVE", source: "whatsapp_bot",  createdDaysAgo: 210 },
  { firstName: "Belén",   lastName: "Vega",       phoneIdx: 24, email: "belen.vega@example.com",     status: "INACTIVE", source: "web_form",      dob: "1994-04-22", createdDaysAgo: 195 },
  { firstName: "Lourdes", lastName: "Aguilar",    phoneIdx: 25,                                       status: "INACTIVE", source: "instagram",     createdDaysAgo: 180 },
];

interface AiMemorySeed {
  patientIdx: number;
  key: string;
  value: string;
}

const AI_MEMORIES: AiMemorySeed[] = [
  { patientIdx: 0,  key: "preferencia_horario",        value: "Prefiere citas antes de las 11:00." },
  { patientIdx: 1,  key: "alergia",                    value: "Sensibilidad a productos con alcohol." },
  { patientIdx: 2,  key: "categoria_cliente",          value: "VIP — siempre confirmar disponibilidad antes." },
  { patientIdx: 3,  key: "tratamiento_recurrente",     value: "Microblading retoque cada 6 meses." },
  { patientIdx: 4,  key: "bono_activo",                value: "5 sesiones de láser, 3 restantes." },
  { patientIdx: 5,  key: "preferencia_tecnico",        value: "Prefiere Diana para limpiezas." },
  { patientIdx: 6,  key: "origen_lead",                value: "Importada desde HubSpot en abr/2026." },
  { patientIdx: 9,  key: "referido_por",               value: "Recomendada por María García (paciente 0)." },
  { patientIdx: 13, key: "interes_actual",             value: "Solicita valoración previa para microblading." },
  { patientIdx: 19, key: "campana_recuperacion",       value: "Candidata a campaña de inactivos 6m con promoción -20%." },
];

interface ConvSeed {
  patientIdx: number;
  channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "WEB";
  requiresHuman?: boolean;
  botPaused?: boolean;
  daysAgo: number;
  messages: Array<{ role: "USER" | "ASSISTANT"; content: string; minuteOffset: number }>;
}

const CONVERSATIONS: ConvSeed[] = [
  {
    patientIdx: 10, // Beatriz — lead nuevo
    channel: "WHATSAPP",
    daysAgo: 14,
    messages: [
      { role: "USER",      content: "Hola, ¿tienen huecos esta semana para una limpieza facial?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola! Sí, tengo disponibilidad. ¿Prefieres mañana por la mañana o jueves por la tarde?", minuteOffset: 1 },
      { role: "USER",      content: "Jueves por la tarde estaría perfecto.", minuteOffset: 3 },
      { role: "ASSISTANT", content: "Genial. Te puedo apuntar el jueves a las 17:00 con Diana. ¿Me confirmas tu nombre completo y teléfono?", minuteOffset: 4 },
      { role: "USER",      content: "Beatriz Álvarez, ese mismo es mi número.", minuteOffset: 6 },
      { role: "ASSISTANT", content: "Perfecto Beatriz, cita confirmada para el jueves 6 jun a las 17:00 con Diana. Te llegará un recordatorio el día anterior. 🌸", minuteOffset: 7 },
    ],
  },
  {
    patientIdx: 13, // Mónica — pregunta por microblading
    channel: "WHATSAPP",
    daysAgo: 7,
    messages: [
      { role: "USER",      content: "Buenas! Me gustaría informarme sobre microblading. ¿Cuánto cuesta?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola Mónica! El microblading tiene un precio de 350 € e incluye una sesión de retoque al mes. ¿Te gustaría agendar una valoración previa? Es gratuita.", minuteOffset: 2 },
      { role: "USER",      content: "Sí, me viene bien la valoración. ¿Cuándo puede ser?", minuteOffset: 4 },
      { role: "ASSISTANT", content: "Tenemos hueco mañana a las 11:30 con Diana, o el viernes a las 16:00. ¿Cuál te encaja?", minuteOffset: 5 },
      { role: "USER",      content: "Mañana a las 11:30 perfecto.", minuteOffset: 8 },
      { role: "ASSISTANT", content: "Cita reservada para mañana 27 may a las 11:30 con Diana. ¡Hasta entonces! ✨", minuteOffset: 9 },
    ],
  },
  {
    patientIdx: 11, // Isabel — pregunta láser
    channel: "INSTAGRAM",
    daysAgo: 12,
    messages: [
      { role: "USER",      content: "Hola! Vi en su Instagram que ofrecen depilación láser. ¿Cuántas sesiones se necesitan?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola! Depende de la zona y el tipo de vello, pero el tratamiento completo suele requerir entre 6 y 8 sesiones, separadas por 4-6 semanas. ¿De qué zona te gustaría tratar?", minuteOffset: 3 },
      { role: "USER",      content: "Axilas e ingles.", minuteOffset: 8 },
      { role: "ASSISTANT", content: "Tenemos un bono de 6 sesiones para axilas+ingles por 480 € (en vez de 540 € sueltas). ¿Quieres reservar una primera sesión o prefieres pasar primero a una valoración gratuita?", minuteOffset: 9 },
      { role: "USER",      content: "Mejor valoración primero.", minuteOffset: 15 },
      { role: "ASSISTANT", content: "¡Perfecto! Te ofrezco el lunes 9 jun a las 10:30 o el martes a las 18:00. ¿Cuál te viene mejor?", minuteOffset: 16 },
    ],
  },
  {
    patientIdx: 0, // María — recurrente
    channel: "WHATSAPP",
    daysAgo: 4,
    messages: [
      { role: "USER",      content: "Hola, soy María García. Toca mi limpieza mensual, ¿hueco esta semana?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola María! Claro. Como siempre por la mañana, ¿no? Tengo el miércoles 4 jun a las 09:30 con Diana.", minuteOffset: 1 },
      { role: "USER",      content: "Perfecto.", minuteOffset: 2 },
      { role: "ASSISTANT", content: "Hecho. Miércoles 09:30 con Diana. ¡Hasta entonces! ☀️", minuteOffset: 3 },
    ],
  },
  {
    patientIdx: 4, // Elena — bono activo
    channel: "WHATSAPP",
    daysAgo: 8,
    messages: [
      { role: "USER",      content: "Hola, ¿cuántas sesiones me quedan del bono láser?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "Hola Elena, te quedan 3 sesiones del bono de 5. La última fue el 12 may. ¿Quieres agendar la siguiente?", minuteOffset: 1 },
      { role: "USER",      content: "Sí, lo antes posible.", minuteOffset: 2 },
      { role: "ASSISTANT", content: "Tengo el viernes 31 may a las 17:00 con Sara, o el sábado a las 10:00.", minuteOffset: 3 },
      { role: "USER",      content: "Sábado.", minuteOffset: 5 },
      { role: "ASSISTANT", content: "Reservado, sábado 1 jun a las 10:00 con Sara. Te recordaremos el día anterior.", minuteOffset: 6 },
    ],
  },
  {
    patientIdx: 14, // Silvia — problemática
    channel: "FACEBOOK",
    requiresHuman: true,
    daysAgo: 5,
    messages: [
      { role: "USER",      content: "Hola, quiero cancelar la cita y que me devuelvan el dinero del bono que no he usado.", minuteOffset: 0 },
      { role: "ASSISTANT", content: "Hola Silvia, lamento que quieras cancelar. Para gestionar la devolución del bono necesito que hable contigo una persona del equipo. Te derivo en este momento — alguien te contestará en menos de 1 hora.", minuteOffset: 1 },
    ],
  },
  {
    patientIdx: 5, // Sofía
    channel: "INSTAGRAM",
    daysAgo: 3,
    messages: [
      { role: "USER",      content: "Hola! Cuánto cuesta la radiofrecuencia abdomen?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola Sofía! La sesión de radiofrecuencia abdominal cuesta 75 €. Solemos recomendar un mínimo de 6-8 sesiones, y hay bono de 8 sesiones por 520 €. ¿Te apetece una valoración previa?", minuteOffset: 2 },
      { role: "USER",      content: "Sí, ¿cuándo puede ser?", minuteOffset: 6 },
      { role: "ASSISTANT", content: "Tengo hueco el lunes a las 17:30 con Sara, ¿te viene bien?", minuteOffset: 7 },
      { role: "USER",      content: "Sí, perfecto.", minuteOffset: 12 },
      { role: "ASSISTANT", content: "¡Listo! Lunes 2 jun a las 17:30 con Sara.", minuteOffset: 13 },
    ],
  },
  {
    patientIdx: 6, // Lucía
    channel: "WHATSAPP",
    daysAgo: 2,
    messages: [
      { role: "USER",      content: "Hola, soy nueva. Me gustaría una valoración facial.", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola Lucía! Genial. ¿Tienes preferencia entre mañana o tarde, y algún día concreto esta semana?", minuteOffset: 1 },
      { role: "USER",      content: "Tarde, jueves o viernes.", minuteOffset: 3 },
      { role: "ASSISTANT", content: "Te puedo ofrecer el jueves 30 may a las 18:00 con Carla, o el viernes a las 17:00 con Diana.", minuteOffset: 4 },
      { role: "USER",      content: "Carla el jueves.", minuteOffset: 6 },
      { role: "ASSISTANT", content: "Reservado para el jueves 30 may a las 18:00 con Carla. ¡Bienvenida! 💜", minuteOffset: 7 },
    ],
  },
  {
    patientIdx: 17, // Eva — cancelación dificultosa
    channel: "WHATSAPP",
    requiresHuman: true,
    daysAgo: 1,
    messages: [
      { role: "USER",      content: "Llevo intentando cancelar la cita desde ayer y nadie responde. Esto es un desastre.", minuteOffset: 0 },
      { role: "ASSISTANT", content: "Eva, lamento muchísimo la espera. Voy a derivar tu mensaje a una persona del equipo ahora mismo para resolverlo personalmente. Te contestamos en breve.", minuteOffset: 1 },
    ],
  },
  {
    patientIdx: 1, // Carmen — pausa de bot
    channel: "WHATSAPP",
    botPaused: true,
    daysAgo: 6,
    messages: [
      { role: "USER",      content: "Hola, ¿está abierto el sábado?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "Hola Carmen, sí, sábados de 10 a 14h.", minuteOffset: 1 },
      { role: "USER",      content: "Tengo una duda específica sobre los productos que usáis. ¿Podéis llamarme?", minuteOffset: 5 },
      { role: "ASSISTANT", content: "Claro. Te derivo con el equipo, te llaman en cuanto puedan.", minuteOffset: 6 },
    ],
  },
  {
    patientIdx: 15, // Andrea
    channel: "WEB",
    daysAgo: 4,
    messages: [
      { role: "USER",      content: "Buenas, vi su web y me interesa el diseño de cejas.", minuteOffset: 0 },
      { role: "ASSISTANT", content: "¡Hola Andrea! El diseño de cejas + perfilado cuesta 35 €. ¿Te apetece reservar?", minuteOffset: 2 },
      { role: "USER",      content: "Sí, ¿qué hueco hay?", minuteOffset: 8 },
      { role: "ASSISTANT", content: "Tengo el martes 3 jun a las 12:00 con Paula, o el miércoles a las 16:30.", minuteOffset: 9 },
    ],
  },
  {
    patientIdx: 8, // Patricia
    channel: "WHATSAPP",
    daysAgo: 10,
    messages: [
      { role: "USER",      content: "Hola, ¿puedo cambiar mi cita del jueves?", minuteOffset: 0 },
      { role: "ASSISTANT", content: "Por supuesto. ¿Para qué día te interesa?", minuteOffset: 1 },
      { role: "USER",      content: "Mejor el viernes a la misma hora.", minuteOffset: 3 },
      { role: "ASSISTANT", content: "Cambio hecho. Viernes 23 may a las 17:00 con Isis. ¡Hasta entonces!", minuteOffset: 4 },
    ],
  },
];

interface ApptSeed {
  patientIdx: number;
  treatmentSlug: string;
  technicianName: string; // matching seeded tech name
  daysFromNow: number;
  hour: number;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  createdBy: "BOT" | "STAFF" | "HUMAN";
  notes?: string;
}

// Mix: past completed, near-future confirmed, a few cancelled and one no-show.
const APPOINTMENTS: ApptSeed[] = [
  // Past completed
  { patientIdx: 0,  treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: -28, hour: 10, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 0,  treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: -7,  hour: 10, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 1,  treatmentSlug: "diseno-cejas",    technicianName: "Paula Núñez",  daysFromNow: -21, hour: 12, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 2,  treatmentSlug: "dermapen",         technicianName: "Leo",   daysFromNow: -14, hour: 16, status: "COMPLETED", createdBy: "STAFF" },
  { patientIdx: 3,  treatmentSlug: "microblading",     technicianName: "Leo",   daysFromNow: -42, hour: 11, status: "COMPLETED", createdBy: "STAFF", notes: "Sesión inicial — retoque en 4-6 semanas." },
  { patientIdx: 4,  treatmentSlug: "laser",            technicianName: "Sara Mendoza", daysFromNow: -28, hour: 17, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 4,  treatmentSlug: "laser",            technicianName: "Sara Mendoza", daysFromNow: -10, hour: 17, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 5,  treatmentSlug: "radiofrecuencia", technicianName: "Sara Mendoza", daysFromNow: -5,  hour: 18, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 6,  treatmentSlug: "limpieza-facial",  technicianName: "Carla Esteban", daysFromNow: -3,  hour: 18, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 7,  treatmentSlug: "depilacion-hilo", technicianName: "Isis",  daysFromNow: -9,  hour: 12, status: "COMPLETED", createdBy: "BOT" },
  { patientIdx: 8,  treatmentSlug: "valoracion",       technicianName: "Diana", daysFromNow: -14, hour: 11, status: "COMPLETED", createdBy: "STAFF" },
  { patientIdx: 9,  treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: -7,  hour: 16, status: "COMPLETED", createdBy: "BOT" },

  // Near future — confirmed
  { patientIdx: 0,  treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: 3,  hour: 9,  status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 1,  treatmentSlug: "dermapen",         technicianName: "Leo",   daysFromNow: 5,  hour: 16, status: "CONFIRMED", createdBy: "STAFF" },
  { patientIdx: 2,  treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: 2,  hour: 18, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 4,  treatmentSlug: "laser",            technicianName: "Sara Mendoza", daysFromNow: 1,  hour: 17, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 5,  treatmentSlug: "radiofrecuencia", technicianName: "Sara Mendoza", daysFromNow: 1,  hour: 11, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 6,  treatmentSlug: "valoracion",       technicianName: "Carla Esteban", daysFromNow: 2,  hour: 18, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 7,  treatmentSlug: "depilacion-hilo", technicianName: "Isis",  daysFromNow: 6,  hour: 13, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 9,  treatmentSlug: "diseno-cejas",    technicianName: "Paula Núñez", daysFromNow: 4,  hour: 12, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 10, treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: 1,  hour: 17, status: "CONFIRMED", createdBy: "BOT", notes: "Primera cita — lead nueva por WhatsApp." },
  { patientIdx: 11, treatmentSlug: "valoracion",       technicianName: "Sara Mendoza", daysFromNow: 7,  hour: 10, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 13, treatmentSlug: "valoracion",       technicianName: "Diana", daysFromNow: 1,  hour: 11, status: "CONFIRMED", createdBy: "BOT" },
  { patientIdx: 15, treatmentSlug: "diseno-cejas",    technicianName: "Paula Núñez", daysFromNow: 5,  hour: 12, status: "CONFIRMED", createdBy: "BOT" },

  // Cancelled
  { patientIdx: 12, treatmentSlug: "limpieza-facial",  technicianName: "Diana", daysFromNow: -3,  hour: 10, status: "CANCELLED", createdBy: "BOT",  notes: "Cancelado por la paciente, motivos personales." },
  { patientIdx: 14, treatmentSlug: "valoracion",       technicianName: "Diana", daysFromNow: 4,  hour: 15, status: "CANCELLED", createdBy: "BOT",  notes: "Cancelación con devolución del bono pendiente." },

  // No-show
  { patientIdx: 16, treatmentSlug: "depilacion-hilo", technicianName: "Isis",  daysFromNow: -6,  hour: 12, status: "NO_SHOW",   createdBy: "BOT" },
];

/* ─────────────────────────── execution ─────────────────────────── */

async function main() {
  const clinic = await prisma.clinic.findUnique({ where: { slug: SLUG } });
  if (!clinic) {
    throw new Error(
      `Clínica "${SLUG}" no encontrada. Ejecuta primero \`npm run db:seed\`.`,
    );
  }
  const clinicId = clinic.id;
  console.log(`✓ Clinic: ${clinic.name} (${clinicId})`);

  // 1. ─────────────── Wipe previous demo rows (idempotency) ───────────────
  console.log("→ Limpiando datos demo previos…");
  const prevPatients = await prisma.patient.findMany({
    where: {
      clinicId,
      phone: { startsWith: DEMO_PHONE_PREFIX },
    },
    select: { id: true },
  });
  const prevPatientIds = prevPatients.map((p) => p.id);
  if (prevPatientIds.length > 0) {
    await prisma.appointment.deleteMany({
      where: { patientId: { in: prevPatientIds } },
    });
    await prisma.message.deleteMany({
      where: {
        conversation: { patientId: { in: prevPatientIds } },
      },
    });
    await prisma.humanHandoff.deleteMany({
      where: { patientId: { in: prevPatientIds } },
    });
    await prisma.conversation.deleteMany({
      where: { patientId: { in: prevPatientIds } },
    });
    await prisma.aiMemory.deleteMany({
      where: { patientId: { in: prevPatientIds } },
    });
    await prisma.patient.deleteMany({ where: { id: { in: prevPatientIds } } });
  }

  await prisma.technicianTreatment.deleteMany({
    where: { technicianId: { startsWith: "demo-tech-" } },
  });
  await prisma.technician.deleteMany({
    where: { id: { startsWith: "demo-tech-" } },
  });

  // 2. ─────────────── Technicians ───────────────
  console.log("→ Insertando 3 técnicos demo…");
  for (const t of TECHNICIANS) {
    await prisma.technician.create({
      data: {
        id: t.id,
        clinicId,
        name: t.name,
        email: t.email,
        phone: t.phone,
        color: t.color,
        prioritySensitive: t.prioritySensitive,
        active: true,
      },
    });
  }

  // Treatments lookup
  const treatments = await prisma.treatment.findMany({
    where: { clinicId },
    select: { id: true, slug: true, durationMinutes: true },
  });
  const treatmentBySlug = new Map(treatments.map((t) => [t.slug, t]));

  // Technician lookup (by name — covers both demo + existing)
  const allTechs = await prisma.technician.findMany({
    where: { clinicId },
    select: { id: true, name: true },
  });
  const techByName = new Map(allTechs.map((t) => [t.name, t.id]));

  // 3. ─────────────── Tech ↔ Treatment mappings ───────────────
  for (const m of TECH_TREATMENT_MAP) {
    const treatId = treatmentBySlug.get(m.treat)?.id;
    if (!treatId) continue;
    await prisma.technicianTreatment.create({
      data: {
        clinicId,
        technicianId: m.tech,
        treatmentId: treatId,
        isPrimary: m.isPrimary ?? false,
        isPreferred: m.isPreferred ?? false,
      },
    });
  }

  // 4. ─────────────── Patients ───────────────
  console.log(`→ Insertando ${PATIENTS.length} pacientes…`);
  const createdPatients: Array<{ id: string; firstName: string }> = [];
  for (const p of PATIENTS) {
    const phone = `${DEMO_PHONE_PREFIX}${String(p.phoneIdx).padStart(3, "0")}`;
    const createdAt = new Date(Date.now() - p.createdDaysAgo * day);
    const patient = await prisma.patient.create({
      data: {
        clinicId,
        firstName: p.firstName,
        lastName: p.lastName,
        phone,
        email: p.email ?? null,
        dob: p.dob ? new Date(p.dob) : null,
        notes: p.notes ?? null,
        source: p.source,
        status: p.status,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true, firstName: true },
    });
    createdPatients.push(patient);
  }

  // 5. ─────────────── Appointments ───────────────
  console.log(`→ Insertando ${APPOINTMENTS.length} citas…`);
  for (const a of APPOINTMENTS) {
    const patient = createdPatients[a.patientIdx];
    const treatment = treatmentBySlug.get(a.treatmentSlug);
    const technicianId = techByName.get(a.technicianName);
    if (!patient || !treatment || !technicianId) {
      console.warn(
        `  · Skipping appointment: patient=${a.patientIdx} treat=${a.treatmentSlug} tech=${a.technicianName}`,
      );
      continue;
    }
    const startsAt = daysFromNow(a.daysFromNow, a.hour);
    const endsAt = new Date(
      startsAt.getTime() + treatment.durationMinutes * minute,
    );
    await prisma.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        treatmentId: treatment.id,
        technicianId,
        startsAt,
        endsAt,
        status: a.status,
        createdBy: a.createdBy,
        notes: a.notes ?? null,
        cancelledAt: a.status === "CANCELLED" ? new Date(startsAt.getTime() - day) : null,
        cancelReason: a.status === "CANCELLED" ? a.notes ?? "Cancelación a petición del cliente." : null,
      },
    });
  }

  // 6. ─────────────── Conversations + messages ───────────────
  console.log(`→ Insertando ${CONVERSATIONS.length} conversaciones…`);
  for (const c of CONVERSATIONS) {
    const patient = createdPatients[c.patientIdx];
    if (!patient) continue;
    const channel = c.channel === "INSTAGRAM" ? "WHATSAPP" : c.channel === "FACEBOOK" ? "WHATSAPP" : c.channel; // schema enum is WHATSAPP|WEB|SMS|PHONE
    // Persist the "intended" channel into messages.metadata for the UI to surface, while the row uses the schema enum.
    const baseTime = new Date(Date.now() - c.daysAgo * day);
    const conv = await prisma.conversation.create({
      data: {
        clinicId,
        patientId: patient.id,
        channel: channel as "WHATSAPP" | "WEB" | "SMS" | "PHONE",
        requiresHuman: c.requiresHuman ?? false,
        botPaused: c.botPaused ?? false,
        lastMessageAt: new Date(
          baseTime.getTime() +
            (c.messages[c.messages.length - 1]?.minuteOffset ?? 0) * minute,
        ),
        createdAt: baseTime,
      },
      select: { id: true },
    });
    for (const m of c.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: m.role,
          content: m.content,
          metadata:
            c.channel === "INSTAGRAM" || c.channel === "FACEBOOK"
              ? { sourceChannel: c.channel }
              : undefined,
          createdAt: new Date(baseTime.getTime() + m.minuteOffset * minute),
        },
      });
    }
    if (c.requiresHuman) {
      await prisma.humanHandoff.create({
        data: {
          clinicId,
          conversationId: conv.id,
          patientId: patient.id,
          reason: c.messages[0]?.content.slice(0, 100) ?? "Cliente solicita ayuda humana",
          status: "OPEN",
          openedAt: new Date(baseTime.getTime() + 60_000),
        },
      });
    }
  }

  // 7. ─────────────── AI memories ───────────────
  console.log(`→ Insertando ${AI_MEMORIES.length} memorias IA…`);
  for (const m of AI_MEMORIES) {
    const patient = createdPatients[m.patientIdx];
    if (!patient) continue;
    await prisma.aiMemory.upsert({
      where: { patientId_key: { patientId: patient.id, key: m.key } },
      update: { value: m.value },
      create: {
        clinicId,
        patientId: patient.id,
        key: m.key,
        value: m.value,
      },
    });
  }

  // 8. ─────────────── Audit log markers ───────────────
  console.log("→ Marcando audit log…");
  await prisma.auditLog.create({
    data: {
      clinicId,
      actorUserId: DEMO_AUDIT_ACTOR,
      action: "demo.seed",
      target: null,
      metadata: {
        technicians: TECHNICIANS.length,
        patients: PATIENTS.length,
        appointments: APPOINTMENTS.length,
        conversations: CONVERSATIONS.length,
        aiMemories: AI_MEMORIES.length,
      },
    },
  });

  /* ─────────────── Summary ─────────────── */
  console.log("");
  console.log("✓ Datos demo cargados");
  console.log(`  Técnicos nuevos: ${TECHNICIANS.length}`);
  console.log(`  Pacientes:       ${PATIENTS.length}`);
  console.log(`  Citas:           ${APPOINTMENTS.length}`);
  console.log(`  Conversaciones:  ${CONVERSATIONS.length}`);
  console.log(`  AI memorias:     ${AI_MEMORIES.length}`);
  console.log("");
  console.log("Sugerencias para probar:");
  console.log("  · /app                  → dashboard con KPIs actualizados");
  console.log("  · /app/clients          → lista paginada de 25 pacientes");
  console.log("  · /app/conversations    → bandeja con 12 hilos + 2 'Necesitan ayuda'");
  console.log("  · /app/agenda           → semana con citas próximas");
  console.log("  · /app/pipeline         → kanban poblado");
  console.log("  · /admin/patients       → cross-tenant ve los 25 nuevos");
  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// Ensure the const above isn't tree-shaken — used for type inference clarity.
void pick;
