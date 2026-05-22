"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: { code: string; message: string } }
  : { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

// Schema matches the `set_memory` tool the bot uses (src/server/ai/tools.ts):
// key 1-64 chars, value 1-500 chars. Staff edits go through the same shape
// so future-you doesn't have to reconcile two definitions.
const upsertSchema = z.object({
  patientId: z.string().min(1),
  key: z
    .string()
    .trim()
    .min(1, "Clave obligatoria")
    .max(64, "Máximo 64 caracteres")
    .regex(
      /^[a-z0-9_-]+$/i,
      "Solo letras, dígitos, guion bajo o guion (sin espacios ni acentos)",
    ),
  value: z.string().trim().min(1, "Valor obligatorio").max(500, "Máximo 500 caracteres"),
});

export type UpsertMemoryInput = z.input<typeof upsertSchema>;

/**
 * Create or update an AI memory row for a patient. Same model the bot's
 * `set_memory` tool writes to — staff and bot can both shape what the bot
 * remembers. (patientId, key) is unique; calling twice with the same key
 * overwrites the value (last-write-wins, by design).
 */
export async function upsertMemoryAction(input: UpsertMemoryInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const parsed = upsertSchema.safeParse(input);
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

  // Clinic scope: confirm the patient belongs to the session's clinic.
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, clinicId },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Paciente no encontrado" } };
  }

  await prisma.aiMemory.upsert({
    where: { patientId_key: { patientId: patient.id, key: parsed.data.key } },
    update: { value: parsed.data.value },
    create: {
      clinicId,
      patientId: patient.id,
      key: parsed.data.key,
      value: parsed.data.value,
    },
  });

  await logAudit({
    clinicId,
    actorUserId: session.user.id,
    action: "memory.upserted",
    target: `memory:${patient.id}:${parsed.data.key}`,
    metadata: { key: parsed.data.key },
  });

  revalidatePath(`/app/clients/${patient.id}`);
  return { ok: true };
}

const deleteSchema = z.object({
  patientId: z.string().min(1),
  key: z.string().min(1),
});

export type DeleteMemoryInput = z.input<typeof deleteSchema>;

/**
 * Delete one AiMemory row. Idempotent — deleting a non-existent key is a
 * no-op success (so reseed/race conditions don't surface as errors). The
 * delete is clinic-scoped via the patient existence check.
 */
export async function deleteMemoryAction(input: DeleteMemoryInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Datos inválidos" } };
  }

  const clinicId = session.user.clinicId;
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, clinicId },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Paciente no encontrado" } };
  }

  await prisma.aiMemory.deleteMany({
    where: { patientId: patient.id, key: parsed.data.key },
  });

  await logAudit({
    clinicId,
    actorUserId: session.user.id,
    action: "memory.deleted",
    target: `memory:${patient.id}:${parsed.data.key}`,
    metadata: { key: parsed.data.key },
  });

  revalidatePath(`/app/clients/${patient.id}`);
  return { ok: true };
}
