"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import {
  CLINIC_AI_TONE_OPTIONS,
  CLINIC_LOCALE_OPTIONS,
  CLINIC_TIMEZONE_OPTIONS,
} from "./clinic-options";
import { MODULE_KEYS, isKnownModule } from "./module-catalogue";

type ActionResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } };

const inputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.enum(CLINIC_TIMEZONE_OPTIONS),
  locale: z.enum(CLINIC_LOCALE_OPTIONS),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\+\d{8,15}$/, "Formato E.164 (ej. +34911000000)")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  minLeadMinutes: z.number().int().min(0).max(7 * 24 * 60),
  slotGranularityMin: z.number().int().min(5).max(120),
});

export type UpdateClinicInput = z.input<typeof inputSchema>;

/**
 * Update clinic basics from /app/settings/clinic. OWNER + ADMIN only —
 * RECEPTIONIST/STAFF roles can read settings but not edit them.
 *
 * Changing `whatsappNumber` repoints the inbound webhook routing, since
 * the WhatsApp webhook resolves clinics by matching the `To:` address
 * against this column. A blank value clears it.
 */
export async function updateClinicAction(input: UpdateClinicInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: first?.message ?? "Datos inválidos" },
    };
  }

  // Catch the unique-violation on whatsappNumber when a different clinic
  // already holds that number — would otherwise surface as a P2002.
  if (parsed.data.whatsappNumber) {
    const existing = await prisma.clinic.findUnique({
      where: { whatsappNumber: parsed.data.whatsappNumber },
      select: { id: true },
    });
    if (existing && existing.id !== session.user.clinicId) {
      return {
        ok: false,
        error: {
          code: "WHATSAPP_TAKEN",
          message: "Ese número ya está asignado a otra clínica",
        },
      };
    }
  }

  await prisma.clinic.update({
    where: { id: session.user.clinicId },
    data: parsed.data,
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/clinic");
  revalidatePath("/app");
  return { ok: true };
}

const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const windowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    opensAt: z.string().regex(HHMM, "Formato HH:mm"),
    closesAt: z.string().regex(HHMM, "Formato HH:mm"),
  })
  .refine((w) => w.opensAt < w.closesAt, {
    message: "La hora de cierre debe ser posterior a la apertura",
    path: ["closesAt"],
  });

export type BusinessHoursInput = z.input<typeof windowSchema>[];

function hasOverlap(rows: z.infer<typeof windowSchema>[]): string | null {
  // Group by day and look for time-range overlaps. Two windows overlap when
  // a.opensAt < b.closesAt AND b.opensAt < a.closesAt.
  const byDay = new Map<number, z.infer<typeof windowSchema>[]>();
  for (const r of rows) {
    const arr = byDay.get(r.dayOfWeek) ?? [];
    arr.push(r);
    byDay.set(r.dayOfWeek, arr);
  }
  for (const [day, list] of byDay) {
    const sorted = list.slice().sort((a, b) => a.opensAt.localeCompare(b.opensAt));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.opensAt < sorted[i - 1]!.closesAt) {
        return `Hay franjas que se solapan en el día ${day}`;
      }
    }
  }
  return null;
}

/**
 * Replace the clinic's business-hour windows with the provided set. Each
 * weekday can have zero (closed), one, or many non-overlapping windows
 * (split-shift mornings/afternoons). We delete + recreate inside one
 * transaction rather than diffing — the rows are small and ID-stable
 * tracking would add complexity without benefit.
 */
export async function updateBusinessHoursAction(rows: BusinessHoursInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  const parsed = z.array(windowSchema).safeParse(rows);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: first?.message ?? "Datos inválidos" },
    };
  }

  const overlap = hasOverlap(parsed.data);
  if (overlap) {
    return { ok: false, error: { code: "OVERLAP", message: overlap } };
  }

  const clinicId = session.user.clinicId;
  await prisma.$transaction([
    prisma.clinicBusinessHours.deleteMany({ where: { clinicId } }),
    ...(parsed.data.length > 0
      ? [
          prisma.clinicBusinessHours.createMany({
            data: parsed.data.map((r) => ({ ...r, clinicId })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/hours");
  return { ok: true };
}

const aiConfigSchema = z.object({
  aiTone: z.enum(CLINIC_AI_TONE_OPTIONS),
  aiGuidance: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export type AiConfigInput = z.input<typeof aiConfigSchema>;

/**
 * Update the clinic's AI receptionist config. Tone and free-text guidance
 * are both injected into buildSystemPrompt() on the next inbound message,
 * so changes take effect immediately for new turns (existing in-flight
 * orchestrate() calls keep the prompt they already built).
 */
export async function updateAiConfigAction(input: AiConfigInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  const parsed = aiConfigSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: first?.message ?? "Datos inválidos" },
    };
  }

  await prisma.clinic.update({
    where: { id: session.user.clinicId },
    data: parsed.data,
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/ai");
  return { ok: true };
}

const modulesSchema = z
  .array(z.string())
  .max(MODULE_KEYS.length)
  .transform((arr) => Array.from(new Set(arr.filter(isKnownModule))));

export type UpdateActiveModulesInput = z.input<typeof modulesSchema>;

/**
 * Replace the clinic's active-module set with the provided list. Unknown
 * keys are filtered out (defends against stale forms or hand-crafted
 * payloads); duplicates are collapsed. OWNER + ADMIN only.
 *
 * For v1 the toggles are persistence-only — they don't yet gate behavior
 * in the sidebar or pages. Future phases can read the array and hide nav
 * entries / 404 disabled routes; the data model is in place.
 */
export async function updateActiveModulesAction(
  input: UpdateActiveModulesInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  const parsed = modulesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  await prisma.clinic.update({
    where: { id: session.user.clinicId },
    data: { activeModules: parsed.data },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/modulos");
  revalidatePath("/app");
  return { ok: true };
}
