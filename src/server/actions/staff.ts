"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, signIn } from "@/auth";
import { prisma } from "@/server/db";
import { STAFF_ROLE_OPTIONS } from "./staff-options";

type ActionResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } };

type Role = (typeof STAFF_ROLE_OPTIONS)[number];

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  role: z.enum(STAFF_ROLE_OPTIONS),
  name: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v))
    .optional()
    .nullable(),
});

export type InviteStaffInput = z.input<typeof inviteSchema>;

/**
 * Create a new staff user for the current clinic and trigger Auth.js's
 * email provider so they get a magic-link sign-in to /app. If the email
 * already belongs to an inactive user, we reactivate that row instead of
 * rejecting (idempotent reinvite). OWNER + ADMIN only.
 */
export async function inviteStaffAction(input: InviteStaffInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const { email, role, name } = parsed.data;
  const clinicId = session.user.clinicId;

  // Email is unique per clinic (@@unique([clinicId, email])); look up
  // before deciding to create vs reactivate.
  const existing = await prisma.user.findFirst({ where: { clinicId, email } });
  if (existing) {
    if (existing.active) {
      return {
        ok: false,
        error: {
          code: "ALREADY_ACTIVE",
          message: "Ese email ya tiene una cuenta activa en esta clínica.",
        },
      };
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { active: true, role, ...(name !== undefined ? { name } : {}) },
    });
  } else {
    await prisma.user.create({
      data: { clinicId, email, role, name: name ?? null, active: true },
    });
  }

  // Trigger Auth.js's nodemailer flow. In dev (SMTP_HOST unset) this
  // prints the magic-link URL to the server console; in prod it sends
  // the real email. redirect:false keeps this server action quiet — no
  // NEXT_REDIRECT thrown into the dashboard page that called us.
  try {
    await signIn("nodemailer", { email, redirect: false });
  } catch (e) {
    // The Auth.js signIn helper can throw if the underlying transport
    // rejects (bad SMTP config, etc). The user row is already written,
    // so surface a soft warning rather than failing the whole action.
    console.error("[inviteStaffAction] signIn failed:", e);
    return {
      ok: false,
      error: {
        code: "INVITE_EMAIL_FAILED",
        message:
          "Usuario creado, pero no se pudo enviar el email de acceso. Pídele que entre en /signin.",
      },
    };
  }

  revalidatePath("/app/settings/staff");
  return { ok: true };
}

/**
 * Toggle a staff member's `active` flag. Inactive users can't sign in
 * (custom adapter's getUserByEmail filters by active:true). Refuses to
 * deactivate the calling user or the last active OWNER in the clinic.
 */
export async function setStaffActiveAction(
  userId: string,
  active: boolean,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  if (userId === session.user.id) {
    return {
      ok: false,
      error: { code: "SELF_LOCKOUT", message: "No puedes desactivar tu propia cuenta." },
    };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, clinicId: session.user.clinicId },
  });
  if (!target) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Usuario no encontrado" } };
  }

  // Don't allow leaving the clinic with zero active OWNERs.
  if (!active && target.role === "OWNER") {
    const otherOwners = await prisma.user.count({
      where: {
        clinicId: session.user.clinicId,
        role: "OWNER",
        active: true,
        id: { not: target.id },
      },
    });
    if (otherOwners === 0) {
      return {
        ok: false,
        error: {
          code: "LAST_OWNER",
          message: "No puedes desactivar al último OWNER activo de la clínica.",
        },
      };
    }
  }

  await prisma.user.update({ where: { id: target.id }, data: { active } });
  revalidatePath("/app/settings/staff");
  return { ok: true };
}

const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(STAFF_ROLE_OPTIONS),
});

export type SetStaffRoleInput = z.input<typeof setRoleSchema>;

/**
 * Change a staff member's role. Same role-gate as the other actions, plus
 * the same last-OWNER safety check: if you're demoting the only active
 * OWNER, refuse.
 */
export async function setStaffRoleAction(input: SetStaffRoleInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes permisos" } };
  }

  const parsed = setRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      },
    };
  }

  const { userId, role } = parsed.data;

  const target = await prisma.user.findFirst({
    where: { id: userId, clinicId: session.user.clinicId },
  });
  if (!target) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Usuario no encontrado" } };
  }

  // Only an OWNER can promote/demote OWNER roles.
  if ((target.role === "OWNER" || role === "OWNER") && session.user.role !== "OWNER") {
    return {
      ok: false,
      error: { code: "FORBIDDEN", message: "Solo un OWNER puede cambiar roles OWNER." },
    };
  }

  // Don't strand the clinic with zero OWNERs by demoting the last one.
  if (target.role === "OWNER" && role !== "OWNER") {
    const otherOwners = await prisma.user.count({
      where: {
        clinicId: session.user.clinicId,
        role: "OWNER",
        active: true,
        id: { not: target.id },
      },
    });
    if (otherOwners === 0) {
      return {
        ok: false,
        error: {
          code: "LAST_OWNER",
          message: "No puedes cambiar el rol del último OWNER activo de la clínica.",
        },
      };
    }
  }

  await prisma.user.update({ where: { id: target.id }, data: { role: role as Role } });
  revalidatePath("/app/settings/staff");
  return { ok: true };
}
