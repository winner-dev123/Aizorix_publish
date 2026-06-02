"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import {
  clearAdminCookie,
  issueAdminCookie,
  requirePlatformAdmin,
  verifyPassword,
} from "@/server/admin/auth";

type AdminResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: { code: string; message: string } }
  :
      | { ok: true; data: T }
      | { ok: false; error: { code: string; message: string } };

/* ─────────────────────────── sign-in / sign-out ─────────────────────────── */

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Contraseña obligatoria"),
});

export type SignInAdminInput = z.input<typeof signInSchema>;

/**
 * Sign a platform admin in. Returns a structured error rather than
 * redirecting on its own so the client form can render the message
 * inline (better UX than a flash query param).
 *
 * Failure mode: returns a generic `INVALID_CREDENTIALS` for both
 * "email not found" and "password wrong" — never leak which one it is.
 */
export async function signInPlatformAdminAction(
  input: SignInAdminInput,
): Promise<AdminResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const admin = await prisma.platformAdmin.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, active: true },
  });
  if (!admin || !admin.active) {
    return {
      ok: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos",
      },
    };
  }
  const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!ok) {
    return {
      ok: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos",
      },
    };
  }

  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { lastSignInAt: new Date() },
  });
  await issueAdminCookie(admin.id);
  return { ok: true };
}

/** Server action invoked from a <form action={…}> "Sign out" button. */
export async function signOutPlatformAdminAction(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/signin");
}

/* ─────────────────────────── delete operations ─────────────────────────── */

/**
 * Delete a patient as a platform admin. Distinct from any clinic-user
 * action: bypasses the per-clinic scope, but writes a clearly-labelled
 * audit-log entry so the affected clinic can see who did it.
 *
 * Hard delete — cascading removes appointments, conversations, etc.
 * (matches the Patient->Clinic onDelete: Cascade and is already exercised
 * by the existing tests). If we need soft delete later, swap to an
 * `archivedAt` column.
 */
export async function deletePatientAsAdminAction(
  patientId: string,
): Promise<AdminResult> {
  const admin = await requirePlatformAdmin();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, clinicId: true, firstName: true, phone: true },
  });
  if (!patient) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Paciente no encontrado" },
    };
  }

  await prisma.patient.delete({ where: { id: patient.id } });

  await logAudit({
    clinicId: patient.clinicId,
    actorUserId: null,
    action: "patient.deleted",
    target: `patient:${patient.id}`,
    metadata: {
      via: "platform-admin",
      platformAdminId: admin.id,
      platformAdminEmail: admin.email,
      patientName: patient.firstName,
      patientPhone: patient.phone,
    },
  });

  revalidatePath("/admin/patients");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Delete a technician as a platform admin. Same audit pattern as patient
 * deletion. Schema's TechnicianTreatment / Appointment relations cascade
 * via Prisma onDelete rules already defined for clinic deletion.
 */
export async function deleteTechnicianAsAdminAction(
  technicianId: string,
): Promise<AdminResult> {
  const admin = await requirePlatformAdmin();

  const tech = await prisma.technician.findUnique({
    where: { id: technicianId },
    select: { id: true, clinicId: true, name: true },
  });
  if (!tech) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Técnico no encontrado" },
    };
  }

  await prisma.technician.delete({ where: { id: tech.id } });

  await logAudit({
    clinicId: tech.clinicId,
    actorUserId: null,
    action: "technician.deleted",
    target: `technician:${tech.id}`,
    metadata: {
      via: "platform-admin",
      platformAdminId: admin.id,
      platformAdminEmail: admin.email,
      technicianName: tech.name,
    },
  });

  revalidatePath("/admin/technicians");
  revalidatePath("/admin");
  return { ok: true };
}
