import { z } from "zod";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { LLMToolDefinition } from "./client";
import { prisma } from "../db";
import { findAvailability } from "../availability";
import { matchTreatment } from "../treatments/match";
import { bookAppointment } from "../booking/book";
import { cancelAppointment } from "../booking/cancel";
import { rescheduleAppointment } from "../booking/reschedule";
import { isDomainError } from "../errors";

/**
 * Parses an ISO string from the LLM. If the string carries a timezone (Z or
 * ±HH:MM offset) it is taken as-is. If it is "naive" (e.g. "2026-05-26T10:00")
 * it is interpreted as clinic-local time and converted to UTC. This lets the
 * model say "el paciente pidió las 10" without doing timezone math.
 */
function parseClinicTime(iso: string, timezone: string): Date {
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  if (hasZone) return new Date(iso);
  return fromZonedTime(iso, timezone);
}

/**
 * Tools the orchestrator exposes to Claude. Each tool has:
 *   - definition: JSONSchema-shaped descriptor sent to the LLM provider
 *   - input: Zod schema used to parse Claude's raw arguments
 *   - handler: server-side execution against Prisma + domain services
 *
 * Handlers swallow DomainError into a structured `{ ok: false, error }`
 * payload so Claude can recover (e.g. propose a different slot) instead
 * of crashing the conversation.
 */

export type ToolContext = {
  clinicId: string;
  clinicTimezone: string;
  conversationId: string;
  patientId: string | null;
  externalChatId: string;
  now: Date;
};

export type ToolHandlerResult =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: string; message: string } };

type Tool<TInput> = {
  definition: LLMToolDefinition;
  input: z.ZodType<TInput>;
  handler: (input: TInput, ctx: ToolContext) => Promise<ToolHandlerResult>;
};

// ----- find_treatment ---------------------------------------------------

const findTreatmentInput = z.object({
  query: z.string().min(1),
});

const findTreatment: Tool<z.infer<typeof findTreatmentInput>> = {
  input: findTreatmentInput,
  definition: {
    name: "find_treatment",
    description:
      "Buscar un tratamiento por nombre o palabras clave en la oferta de la clínica. Devuelve la mejor coincidencia y candidatos alternativos, o indica si se necesita valoración previa.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto libre del paciente, ej. 'limpieza facial profunda'." },
      },
      required: ["query"],
    },
  },
  async handler({ query }, ctx) {
    const result = await matchTreatment(ctx.clinicId, query);
    return { ok: true, data: result };
  },
};

// ----- find_availability ------------------------------------------------

const findAvailabilityInput = z.object({
  treatmentId: z.string().min(1),
  technicianId: z.string().min(1).optional(),
  fromLocal: z.string().min(1),
  toLocal: z.string().min(1),
});

const findAvailabilityTool: Tool<z.infer<typeof findAvailabilityInput>> = {
  input: findAvailabilityInput,
  definition: {
    name: "find_availability",
    description:
      "Listar huecos disponibles para un tratamiento entre dos fechas (hora local de la clínica). Si quieres filtrar por técnico, usa el ID real (ej. 'tech-diana-bellem'), NUNCA el nombre. Si no estás seguro del ID, llama sin technicianId y los slots devueltos lo incluyen. Cada slot trae startsAtLocal (para enviar a book_appointment) y humanLocal (para mostrar al paciente).",
    inputSchema: {
      type: "object",
      properties: {
        treatmentId: { type: "string", description: "ID del tratamiento devuelto por find_treatment." },
        technicianId: {
          type: "string",
          description: "Opcional. ID interno del técnico (ej. 'tech-diana-bellem'). NUNCA el nombre.",
        },
        fromLocal: {
          type: "string",
          description: "Inicio del rango en hora LOCAL de la clínica, formato 'YYYY-MM-DDTHH:mm:ss', SIN sufijo Z.",
        },
        toLocal: {
          type: "string",
          description: "Fin del rango en hora LOCAL de la clínica, formato 'YYYY-MM-DDTHH:mm:ss', SIN sufijo Z.",
        },
      },
      required: ["treatmentId", "fromLocal", "toLocal"],
    },
  },
  async handler({ treatmentId, technicianId, fromLocal, toLocal }, ctx) {
    if (technicianId && /^[A-Z]/.test(technicianId) && !technicianId.includes("-")) {
      return {
        ok: false,
        error: {
          code: "TECHNICIAN_ID_INVALID",
          message: `'${technicianId}' parece un nombre, no un ID. Usa el technicianId que aparece en los slots de una llamada previa, o llama sin technicianId.`,
        },
      };
    }
    const slots = await findAvailability({
      clinicId: ctx.clinicId,
      treatmentId,
      technicianId,
      fromDate: parseClinicTime(fromLocal, ctx.clinicTimezone),
      toDate: parseClinicTime(toLocal, ctx.clinicTimezone),
      now: ctx.now,
    });
    const tz = ctx.clinicTimezone;
    const enriched = slots.slice(0, 20).map((s) => ({
      // Pass this value back verbatim to book_appointment.startsAtLocal.
      startsAtLocal: formatInTimeZone(s.startsAt, tz, "yyyy-MM-dd'T'HH:mm:ss"),
      endsAtLocal: formatInTimeZone(s.endsAt, tz, "yyyy-MM-dd'T'HH:mm:ss"),
      // Human-readable form for the chat reply ("martes 26 may, 10:00").
      humanLocal: formatInTimeZone(s.startsAt, tz, "EEEE d MMM, HH:mm"),
      technicianId: s.technicianId,
    }));
    return { ok: true, data: { slots: enriched, totalCount: slots.length } };
  },
};

// ----- book_appointment -------------------------------------------------

const bookAppointmentInput = z.object({
  treatmentId: z.string().min(1),
  technicianId: z.string().min(1),
  startsAtLocal: z.string().min(1),
  notes: z.string().max(500).optional(),
});

const bookAppointmentTool: Tool<z.infer<typeof bookAppointmentInput>> = {
  input: bookAppointmentInput,
  definition: {
    name: "book_appointment",
    description:
      "Reservar una cita para el paciente actual. Requiere tratamiento, technicianId real (NO el nombre), y la hora EXACTA tal y como aparece en el campo startsAtLocal de uno de los slots devueltos por find_availability. NO añadas Z al final. Falla con códigos como OVERLAP, OUTSIDE_BUSINESS_HOURS, TECHNICIAN_NOT_ELIGIBLE — usa esos códigos para proponer alternativas en lugar de repetir la misma llamada.",
    inputSchema: {
      type: "object",
      properties: {
        treatmentId: { type: "string" },
        technicianId: { type: "string", description: "ID real (ej. 'tech-diana-bellem'), NO el nombre." },
        startsAtLocal: {
          type: "string",
          description: "Hora LOCAL de la clínica en formato 'YYYY-MM-DDTHH:mm:ss', SIN sufijo Z. Copia el valor exacto del campo startsAtLocal de un slot devuelto por find_availability.",
        },
        notes: { type: "string" },
      },
      required: ["treatmentId", "technicianId", "startsAtLocal"],
    },
  },
  async handler({ treatmentId, technicianId, startsAtLocal, notes }, ctx) {
    if (!ctx.patientId) {
      return {
        ok: false,
        error: { code: "PATIENT_REQUIRED", message: "No se ha identificado al paciente. Llama antes a find_or_create_patient." },
      };
    }

    // Duplicate-booking guard: the same patient may not hold two ACTIVE
    // (PENDING/CONFIRMED) appointments for the same treatment in the
    // future. We surface the existing one so the LLM can propose
    // rescheduling or cancelling instead of stacking duplicates.
    const duplicate = await prisma.appointment.findFirst({
      where: {
        patientId: ctx.patientId,
        treatmentId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: ctx.now },
      },
      orderBy: { startsAt: "asc" },
    });
    if (duplicate) {
      const tz = ctx.clinicTimezone;
      return {
        ok: false,
        error: {
          code: "DUPLICATE_BOOKING",
          message: `El paciente ya tiene una cita ${duplicate.status} para este tratamiento el ${formatInTimeZone(duplicate.startsAt, tz, "EEEE d MMM 'a las' HH:mm")} (id=${duplicate.id}). Antes de crear otra, propón al paciente reprogramarla con reschedule_appointment o cancelarla con cancel_appointment.`,
        },
      };
    }

    try {
      const appointment = await bookAppointment({
        clinicId: ctx.clinicId,
        patientId: ctx.patientId,
        treatmentId,
        technicianId,
        startsAt: parseClinicTime(startsAtLocal, ctx.clinicTimezone),
        notes,
        createdBy: "BOT",
        now: ctx.now,
      });
      const tz = ctx.clinicTimezone;
      return {
        ok: true,
        data: {
          appointment,
          startsAtLocal: formatInTimeZone(appointment.startsAt, tz, "yyyy-MM-dd'T'HH:mm:ss"),
          humanLocal: formatInTimeZone(appointment.startsAt, tz, "EEEE d MMM, HH:mm"),
        },
      };
    } catch (err) {
      if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message } };
      throw err;
    }
  },
};

// ----- cancel_appointment -----------------------------------------------

const cancelInput = z.object({
  appointmentId: z.string().min(1),
  reason: z.string().max(280).optional(),
});

const cancelTool: Tool<z.infer<typeof cancelInput>> = {
  input: cancelInput,
  definition: {
    name: "cancel_appointment",
    description: "Cancelar una cita confirmada. Requiere el appointmentId previamente recuperado.",
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
        reason: { type: "string" },
      },
      required: ["appointmentId"],
    },
  },
  async handler({ appointmentId, reason }, ctx) {
    try {
      const appointment = await cancelAppointment({
        appointmentId,
        clinicId: ctx.clinicId,
        reason,
      });
      return { ok: true, data: { appointment } };
    } catch (err) {
      if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message } };
      throw err;
    }
  },
};

// ----- reschedule_appointment ------------------------------------------

const rescheduleInput = z.object({
  appointmentId: z.string().min(1),
  newStartsAtLocal: z.string().min(1),
});

const rescheduleTool: Tool<z.infer<typeof rescheduleInput>> = {
  input: rescheduleInput,
  definition: {
    name: "reschedule_appointment",
    description:
      "Mover una cita existente a un nuevo horario. Mantiene tratamiento y técnico salvo conflicto. Usa el campo startsAtLocal de un slot de find_availability — SIN sufijo Z.",
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
        newStartsAtLocal: {
          type: "string",
          description: "Hora LOCAL en formato 'YYYY-MM-DDTHH:mm:ss', SIN Z.",
        },
      },
      required: ["appointmentId", "newStartsAtLocal"],
    },
  },
  async handler({ appointmentId, newStartsAtLocal }, ctx) {
    try {
      const appointment = await rescheduleAppointment({
        appointmentId,
        clinicId: ctx.clinicId,
        newStartsAt: parseClinicTime(newStartsAtLocal, ctx.clinicTimezone),
        now: ctx.now,
      });
      return { ok: true, data: { appointment } };
    } catch (err) {
      if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message } };
      throw err;
    }
  },
};

// ----- find_or_create_patient ------------------------------------------

const E164 = /^\+\d{8,15}$/;

const patientInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "ANY"]).optional(),
  // Explicit phone in E.164 form. Required when the channel's externalChatId
  // isn't itself a phone (e.g. WEB demo channel uses "demo-<userId>"). For
  // WhatsApp channels the orchestrator falls back to externalChatId when
  // the LLM doesn't pass one.
  phone: z
    .string()
    .trim()
    .regex(E164, "Formato esperado: +<código país><número>, ej. +34611000000")
    .optional(),
});

const patientTool: Tool<z.infer<typeof patientInput>> = {
  input: patientInput,
  definition: {
    name: "find_or_create_patient",
    description:
      "Buscar al paciente actual por su número de teléfono. Si no existe, crearlo como LEAD con el nombre y teléfono proporcionados. Devuelve el patientId que usarán las demás herramientas. REQUIERE un teléfono en formato E.164 (+34...): si el canal es WhatsApp, ya lo tienes (es el remitente, no hace falta que lo pases); si es WEB u otro, PÍDESELO al paciente antes y pásalo como `phone`.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        gender: { type: "string", enum: ["MALE", "FEMALE", "ANY"] },
        phone: {
          type: "string",
          description: "Teléfono del paciente en formato E.164, ej. '+34611000000'. Obligatorio cuando el canal no es WhatsApp.",
        },
      },
      required: ["firstName"],
    },
  },
  async handler({ firstName, lastName, gender, phone }, ctx) {
    // Phone resolution priority:
    //   1. explicit `phone` arg (E.164-validated by Zod)
    //   2. externalChatId if it itself matches E.164 (WhatsApp case)
    //   3. error PHONE_REQUIRED → LLM must ask the user
    const effectivePhone =
      phone ?? (E164.test(ctx.externalChatId) ? ctx.externalChatId : null);
    if (!effectivePhone) {
      return {
        ok: false,
        error: {
          code: "PHONE_REQUIRED",
          message:
            "Necesito el teléfono del paciente en formato E.164 (ej. +34611000000) antes de registrarlo. Pídeselo y vuelve a llamar a find_or_create_patient pasando el campo `phone`.",
        },
      };
    }

    const existing = await prisma.patient.findFirst({
      where: { clinicId: ctx.clinicId, phone: effectivePhone },
    });
    const patient =
      existing ??
      (await prisma.patient.create({
        data: {
          clinicId: ctx.clinicId,
          phone: effectivePhone,
          firstName,
          lastName,
          gender,
          status: "LEAD",
          source: "WHATSAPP_BOT",
        },
      }));
    if (existing && (existing.firstName !== firstName || (lastName && existing.lastName !== lastName))) {
      // Only update if Claude is providing more complete information than we had.
      const update: Record<string, unknown> = {};
      if (!existing.firstName) update.firstName = firstName;
      if (!existing.lastName && lastName) update.lastName = lastName;
      if (Object.keys(update).length) {
        await prisma.patient.update({ where: { id: existing.id }, data: update });
      }
    }
    return {
      ok: true,
      data: {
        patientId: patient.id,
        phone: patient.phone,
        status: patient.status,
        isNew: !existing,
      },
    };
  },
};

// ----- set_memory -------------------------------------------------------

const memoryInput = z.object({
  key: z.string().min(1).max(64),
  value: z.string().min(1).max(500),
});

const memoryTool: Tool<z.infer<typeof memoryInput>> = {
  input: memoryInput,
  definition: {
    name: "set_memory",
    description:
      "Guardar un hecho duradero sobre el paciente (ej. 'preferred_technician=Diana', 'allergic_to=lidocaine'). Persiste entre conversaciones.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["key", "value"],
    },
  },
  async handler({ key, value }, ctx) {
    if (!ctx.patientId) {
      return {
        ok: false,
        error: { code: "PATIENT_REQUIRED", message: "No se ha identificado al paciente." },
      };
    }
    await prisma.aiMemory.upsert({
      where: { patientId_key: { patientId: ctx.patientId, key } },
      update: { value },
      create: { clinicId: ctx.clinicId, patientId: ctx.patientId, key, value },
    });
    return { ok: true, data: { saved: true } };
  },
};

// ----- escalate_to_human -----------------------------------------------

const escalateInput = z.object({ reason: z.string().min(1).max(280) });

const escalateTool: Tool<z.infer<typeof escalateInput>> = {
  input: escalateInput,
  definition: {
    name: "escalate_to_human",
    description:
      "Marcar la conversación para revisión humana cuando: el paciente lo pide expresamente, hay una queja, hay un caso médico no cubierto por la oferta, o has fallado dos veces seguidas con la misma herramienta.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
  async handler({ reason }, ctx) {
    await prisma.conversation.update({
      where: { id: ctx.conversationId },
      // Escalation auto-pauses the bot — staff will resume by marking the
      // handoff as resolved (which clears both flags).
      data: { requiresHuman: true, botPaused: true },
    });
    await prisma.humanHandoff.create({
      data: {
        clinicId: ctx.clinicId,
        conversationId: ctx.conversationId,
        patientId: ctx.patientId,
        reason,
        status: "OPEN",
      },
    });
    return { ok: true, data: { escalated: true, reason } };
  },
};

// ----- list_treatments --------------------------------------------------

const emptyInput = z.object({}).strict();

const listTreatmentsTool: Tool<Record<string, never>> = {
  input: emptyInput,
  definition: {
    name: "list_treatments",
    description:
      "Lista TODOS los tratamientos activos de la clínica con nombre, duración, precio y descripción. Llama esta herramienta cuando el paciente pregunte qué ofrecéis, qué tratamientos hay, o pida ver el catálogo. NO inventes precios ni una lista de memoria — siempre consulta primero.",
    inputSchema: { type: "object", properties: {} },
  },
  async handler(_input, ctx) {
    const treatments = await prisma.treatment.findMany({
      where: { clinicId: ctx.clinicId, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        durationMinutes: true,
        price: true,
        priceType: true,
        showPrice: true,
        requiresValuation: true,
      },
      orderBy: { name: "asc" },
    });
    return {
      ok: true,
      data: {
        treatments: treatments.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description,
          durationMinutes: t.durationMinutes,
          price: t.price ? Number(t.price) : null,
          priceType: t.priceType,
          showPrice: t.showPrice,
          requiresValuation: t.requiresValuation,
        })),
      },
    };
  },
};

// ----- list_technicians -------------------------------------------------

const listTechniciansTool: Tool<Record<string, never>> = {
  input: emptyInput,
  definition: {
    name: "list_technicians",
    description:
      "Lista TODOS los técnicos/profesionales activos de la clínica junto con los tratamientos que pueden realizar. Útil cuando el paciente pregunta por una persona concreta o por quién atiende un tratamiento.",
    inputSchema: { type: "object", properties: {} },
  },
  async handler(_input, ctx) {
    const techs = await prisma.technician.findMany({
      where: { clinicId: ctx.clinicId, active: true },
      include: {
        treatments: {
          where: { isExcluded: false },
          include: { treatment: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
    return {
      ok: true,
      data: {
        technicians: techs.map((t) => ({
          id: t.id,
          name: t.name,
          treatments: t.treatments.map((tt) => ({
            id: tt.treatment.id,
            name: tt.treatment.name,
            isPrimary: tt.isPrimary,
            isPreferred: tt.isPreferred,
            isExclusive: tt.isExclusive,
          })),
        })),
      },
    };
  },
};

// ----- list_business_hours ----------------------------------------------

const DAY_LABEL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const listBusinessHoursTool: Tool<Record<string, never>> = {
  input: emptyInput,
  definition: {
    name: "list_business_hours",
    description:
      "Devuelve los horarios de apertura de la clínica por día de la semana (zona horaria local). Llama esto si el paciente pregunta '¿cuándo abrís?' o para razonar sobre disponibilidad fuera de los slots devueltos por find_availability.",
    inputSchema: { type: "object", properties: {} },
  },
  async handler(_input, ctx) {
    const rows = await prisma.clinicBusinessHours.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }],
    });
    const schedule = DAY_LABEL.map((label, i) => ({
      dayOfWeek: i,
      day: label,
      windows: rows
        .filter((r) => r.dayOfWeek === i)
        .map((r) => ({ opensAt: r.opensAt, closesAt: r.closesAt })),
      closed: !rows.some((r) => r.dayOfWeek === i),
    }));
    return {
      ok: true,
      data: { schedule, timezone: ctx.clinicTimezone },
    };
  },
};

// ----- list_patient_appointments ---------------------------------------

const listPatientAppointmentsTool: Tool<Record<string, never>> = {
  input: emptyInput,
  definition: {
    name: "list_patient_appointments",
    description:
      "Lista las citas del paciente actual: las próximas 8 semanas y las últimas 4 semanas. Llama esta herramienta SIEMPRE antes de proponer un nuevo hueco — si el paciente ya tiene una cita pendiente o confirmada para el mismo tratamiento, NO crees otra; propón reprogramarla o cancelarla en su lugar.",
    inputSchema: { type: "object", properties: {} },
  },
  async handler(_input, ctx) {
    if (!ctx.patientId) {
      return {
        ok: false,
        error: {
          code: "PATIENT_REQUIRED",
          message:
            "Identifica primero al paciente con find_or_create_patient.",
        },
      };
    }
    const past = new Date(ctx.now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const future = new Date(ctx.now.getTime() + 56 * 24 * 60 * 60 * 1000);
    const appts = await prisma.appointment.findMany({
      where: {
        patientId: ctx.patientId,
        startsAt: { gte: past, lte: future },
      },
      include: {
        treatment: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    });
    const tz = ctx.clinicTimezone;
    return {
      ok: true,
      data: {
        appointments: appts.map((a) => ({
          id: a.id,
          treatmentId: a.treatment.id,
          treatmentName: a.treatment.name,
          technicianId: a.technician.id,
          technicianName: a.technician.name,
          status: a.status,
          startsAtLocal: formatInTimeZone(a.startsAt, tz, "yyyy-MM-dd'T'HH:mm:ss"),
          humanLocal: formatInTimeZone(a.startsAt, tz, "EEEE d MMM, HH:mm"),
          isPast: a.startsAt < ctx.now,
        })),
      },
    };
  },
};

// ----- registry --------------------------------------------------------

export const TOOLS = {
  list_treatments: listTreatmentsTool,
  list_technicians: listTechniciansTool,
  list_business_hours: listBusinessHoursTool,
  list_patient_appointments: listPatientAppointmentsTool,
  find_treatment: findTreatment,
  find_availability: findAvailabilityTool,
  book_appointment: bookAppointmentTool,
  cancel_appointment: cancelTool,
  reschedule_appointment: rescheduleTool,
  find_or_create_patient: patientTool,
  set_memory: memoryTool,
  escalate_to_human: escalateTool,
} as const;

export type ToolName = keyof typeof TOOLS;

export function getToolDefinitions(): LLMToolDefinition[] {
  return Object.values(TOOLS).map((t) => t.definition);
}

export async function dispatchTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<ToolHandlerResult> {
  const tool = (TOOLS as Record<string, Tool<unknown>>)[name];
  if (!tool) {
    return { ok: false, error: { code: "UNKNOWN_TOOL", message: `Tool '${name}' is not registered.` } };
  }
  const parsed = tool.input.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      },
    };
  }
  return tool.handler(parsed.data, ctx);
}
