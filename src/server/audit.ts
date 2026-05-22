import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * Append a row to the audit log. Fire-and-forget from the caller's
 * perspective — if the log write fails we log to stderr but never let an
 * audit-log error break the user action. Audit is observability, not
 * correctness.
 */
export async function logAudit(input: {
  clinicId: string;
  actorUserId: string | null;
  action: string;
  target?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: input.clinicId,
        actorUserId: input.actorUserId,
        action: input.action,
        target: input.target ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (e) {
    // Don't surface to the caller — audit failures shouldn't break UX.
    console.error("[audit] log failed", { action: input.action, error: e });
  }
}

/**
 * Lightweight read for /app/settings/audit. Returns most-recent first,
 * with the actor's email joined for display.
 *
 * Accepts the same shape of filters as /api/audit/export.csv so the page
 * and the CSV always agree on what's "visible". Returns the paginated
 * shape `{ rows, total, page, pageSize, totalPages }` so the page can
 * render a footer with prev/next links.
 *
 * The legacy `limit` arg from the pre-pagination days is preserved as a
 * convenience: callers that just want "the latest N" (e.g. the home-page
 * "Cambios recientes" preview) can pass it without dealing with paging.
 */
export async function getRecentAuditLogs(
  clinicId: string,
  limit = 100,
  filters: {
    action?: string;
    from?: Date | null;
    to?: Date | null;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const createdAt =
    filters.from || filters.to
      ? {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        }
      : undefined;

  const where = {
    clinicId,
    ...(filters.action ? { action: filters.action } : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  // Paginated path — caller asked for an explicit page+pageSize. We return
  // the rich shape and ignore `limit` (page slicing is the bound).
  if (filters.page !== undefined || filters.pageSize !== undefined) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, filters.pageSize ?? 50);
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, email: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return { rows, total, page, pageSize, totalPages };
  }

  // Legacy non-paginated path — returns the same shape but with totals
  // derived from a single findMany. Used by the home-page preview.
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { id: true, email: true, name: true } } },
  });
  return { rows, total: rows.length, page: 1, pageSize: limit, totalPages: 1 };
}
