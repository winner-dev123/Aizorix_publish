"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";

/**
 * Bulk-import patients from a CSV. The client parses the CSV, lets the
 * user map columns to patient fields, then sends an array of pre-mapped
 * rows here.
 *
 * Idempotency: phone is unique per clinic (@@unique on [clinicId, phone]),
 * so we pre-check for existing patients and skip rather than crash. The
 * caller gets a per-row outcome (`created` / `skipped` / `error`) so the
 * UI can summarise the run.
 *
 * Authorisation: tenant-scoped to the session's `clinicId`. Rows are
 * always inserted against the logged-in clinic — the caller can't choose.
 */

const E164 = /^\+\d{8,15}$/;

const importRowSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  phone: z.string().trim().regex(E164),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
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

export type ImportRowInput = z.input<typeof importRowSchema>;

export interface ImportSummary {
  total: number;
  created: number;
  skippedDuplicate: number;
  invalid: number;
  /** Per-row outcomes, indexed by the row's original CSV line number. */
  outcomes: Array<
    | { line: number; status: "created"; patientId: string }
    | { line: number; status: "skipped-duplicate" }
    | { line: number; status: "invalid"; message: string }
  >;
}

/** Cap per-import payload to keep transactions sane on a shared DB. */
const MAX_ROWS = 5_000;

interface ActionRow {
  /** Original CSV line number (1-based, header is line 1). */
  line: number;
  data: ImportRowInput;
}

type ActionResult =
  | { ok: true; data: ImportSummary }
  | { ok: false; error: { code: string; message: string } };

export async function importPatientsCsvAction(
  rows: ActionRow[],
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "No session" } };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      error: { code: "EMPTY", message: "Sin filas para importar" },
    };
  }
  if (rows.length > MAX_ROWS) {
    return {
      ok: false,
      error: {
        code: "TOO_MANY_ROWS",
        message: `Máximo ${MAX_ROWS.toLocaleString("es-ES")} filas por importación`,
      },
    };
  }

  const clinicId = session.user.clinicId;
  const outcomes: ImportSummary["outcomes"] = [];

  // 1. Validate every row up-front so we don't open a write transaction
  //    for malformed input. Invalid rows are reported and skipped.
  const valid: Array<{ line: number; data: z.infer<typeof importRowSchema> }> =
    [];
  for (const row of rows) {
    const parsed = importRowSchema.safeParse(row.data);
    if (!parsed.success) {
      outcomes.push({
        line: row.line,
        status: "invalid",
        message: parsed.error.issues[0]?.message ?? "Datos inválidos",
      });
      continue;
    }
    valid.push({ line: row.line, data: parsed.data });
  }

  // 2. Single round-trip to find which phones already exist in this clinic.
  //    Skip those — phone is the natural dedupe key (matches the unique
  //    constraint @@unique([clinicId, phone])).
  const phones = Array.from(new Set(valid.map((v) => v.data.phone)));
  const existing = phones.length
    ? await prisma.patient.findMany({
        where: { clinicId, phone: { in: phones } },
        select: { phone: true },
      })
    : [];
  const existingPhones = new Set(existing.map((e) => e.phone));

  // 3. Also dedupe *within the import file itself* — first occurrence
  //    wins, the rest are reported as duplicates.
  const seenInBatch = new Set<string>();
  const toCreate: Array<{ line: number; data: z.infer<typeof importRowSchema> }> =
    [];
  for (const v of valid) {
    if (existingPhones.has(v.data.phone) || seenInBatch.has(v.data.phone)) {
      outcomes.push({ line: v.line, status: "skipped-duplicate" });
      continue;
    }
    seenInBatch.add(v.data.phone);
    toCreate.push(v);
  }

  // 4. Bulk insert. Each created patient gets a per-row outcome so the
  //    UI can link directly to the patient page if needed.
  let created = 0;
  if (toCreate.length > 0) {
    // We want each row's generated id back, so use createMany would lose
    // that — fall back to a tx of creates. For 5 000 rows this is well
    // under a second on Postgres.
    const results = await prisma.$transaction(
      toCreate.map((v) =>
        prisma.patient.create({
          data: {
            clinicId,
            firstName: v.data.firstName,
            lastName: v.data.lastName ?? null,
            phone: v.data.phone,
            email: v.data.email ?? null,
            dob: v.data.dob ? new Date(v.data.dob) : null,
            notes: v.data.notes ?? null,
            source: "csv-import",
            status: "LEAD",
          },
          select: { id: true },
        }),
      ),
    );
    results.forEach((r, idx) => {
      outcomes.push({
        line: toCreate[idx].line,
        status: "created",
        patientId: r.id,
      });
    });
    created = results.length;
  }

  // Keep outcomes ordered by line number so the UI table reads top-down.
  outcomes.sort((a, b) => a.line - b.line);

  await logAudit({
    clinicId,
    actorUserId: session.user.id,
    action: "patients.csv_imported",
    metadata: {
      total: rows.length,
      created,
      skippedDuplicate: outcomes.filter((o) => o.status === "skipped-duplicate")
        .length,
      invalid: outcomes.filter((o) => o.status === "invalid").length,
    },
  });

  revalidatePath("/app/clients");
  revalidatePath("/app/pipeline");
  revalidatePath("/app");

  return {
    ok: true,
    data: {
      total: rows.length,
      created,
      skippedDuplicate: outcomes.filter((o) => o.status === "skipped-duplicate")
        .length,
      invalid: outcomes.filter((o) => o.status === "invalid").length,
      outcomes,
    },
  };
}
