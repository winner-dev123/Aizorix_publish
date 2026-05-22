"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { PATIENT_GENDER_OPTIONS } from "./patients-options";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: { code: string; message: string } }
  : { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const E164 = /^\+\d{8,15}$/;

const createPatientSchema = z.object({
  firstName: z.string().trim().min(1, "Nombre obligatorio").max(120),
  lastName: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  phone: z.string().trim().regex(E164, "Teléfono en formato E.164 (ej. +34611000000)"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email no válido")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  gender: z
    .enum(PATIENT_GENDER_OPTIONS)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  source: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(2000)
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type CreatePatientInput = z.input<typeof createPatientSchema>;

/**
 * Create a new patient from /app/clients/new. Defaults to status=LEAD so
 * brand-new entries land in the pipeline's "Nuevo" / "Contactado" stages
 * until they have an actual appointment.
 *
 * Phone uniqueness is per-clinic (@@unique on [clinicId, phone]) — we
 * pre-check and surface ALREADY_EXISTS so the user gets a clear error
 * instead of a raw Prisma P2002.
 */
export async function createPatientAction(
  input: CreatePatientInput,
): Promise<ActionResult<{ patientId: string }>> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const clinicId = session.user.clinicId;

  const existing = await prisma.patient.findUnique({
    where: { clinicId_phone: { clinicId, phone: parsed.data.phone } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: {
        code: "ALREADY_EXISTS",
        message: "Ya hay un paciente con ese teléfono en esta clínica",
      },
    };
  }

  const created = await prisma.patient.create({
    data: {
      clinicId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName ?? null,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      gender: parsed.data.gender ?? null,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      source: parsed.data.source ?? null,
      notes: parsed.data.notes ?? null,
      status: "LEAD",
    },
    select: { id: true },
  });

  await logAudit({
    clinicId,
    actorUserId: session.user.id,
    action: "patient.created",
    target: `patient:${created.id}`,
    metadata: { phone: parsed.data.phone, source: parsed.data.source ?? null },
  });

  revalidatePath("/app/clients");
  revalidatePath("/app/pipeline");
  revalidatePath("/app");
  return { ok: true, data: { patientId: created.id } };
}

const updatePatientSchema = createPatientSchema.extend({
  // The Patient.status enum (LEAD / ACTIVE / INACTIVE). Editable so staff
  // can manually promote a lead to ACTIVE without waiting for a completed
  // appointment, or mark someone as INACTIVE.
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]),
});

export type UpdatePatientInput = z.input<typeof updatePatientSchema>;

/**
 * Update an existing patient. Same shape as createPatient but adds the
 * status field. Phone uniqueness is rechecked against OTHER patients in
 * the same clinic — we exclude the row being edited so the user can save
 * without changing the phone.
 */
export async function updatePatientAction(
  patientId: string,
  input: UpdatePatientInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const clinicId = session.user.clinicId;

  // Clinic-scoped existence check (cross-tenant returns NOT_FOUND).
  const existing = await prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    select: { id: true, phone: true },
  });
  if (!existing) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Paciente no encontrado" } };
  }

  // Phone uniqueness — exclude the row being edited so the user can save
  // without changing the phone field.
  if (parsed.data.phone !== existing.phone) {
    const collision = await prisma.patient.findUnique({
      where: { clinicId_phone: { clinicId, phone: parsed.data.phone } },
      select: { id: true },
    });
    if (collision) {
      return {
        ok: false,
        error: {
          code: "ALREADY_EXISTS",
          message: "Ya hay otro paciente con ese teléfono en esta clínica",
        },
      };
    }
  }

  await prisma.patient.update({
    where: { id: existing.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName ?? null,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      gender: parsed.data.gender ?? null,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      source: parsed.data.source ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    },
  });

  await logAudit({
    clinicId,
    actorUserId: session.user.id,
    action: "patient.updated",
    target: `patient:${existing.id}`,
    metadata: {
      status: parsed.data.status,
      phoneChanged: parsed.data.phone !== existing.phone,
    },
  });

  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${existing.id}`);
  revalidatePath("/app/pipeline");
  revalidatePath("/app");
  return { ok: true };
}
