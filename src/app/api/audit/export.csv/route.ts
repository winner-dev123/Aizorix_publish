import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * CSV export of the clinic's audit log. Gated by OWNER+ADMIN — same as
 * /app/settings/audit. Supports optional `from`, `to`, `action` filters.
 *
 * Cap at 10k rows so a runaway query doesn't OOM the function. If a clinic
 * ever has more than 10k matching rows the response includes a header line
 * commented out at the top of the body — graceful degradation, not error.
 *
 * Returns CSV (RFC 4180-ish: comma-separated, double-quoted values with
 * "" escaping for embedded quotes). One header row + N data rows.
 */
const MAX_ROWS = 10_000;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const from = parseDate(sp.get("from"));
  const to = parseDate(sp.get("to"));
  const action = sp.get("action")?.trim() || undefined;

  const where: Parameters<typeof prisma.auditLog.findMany>[0] = {
    where: {
      clinicId: session.user.clinicId,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(action ? { action } : {}),
    },
  };

  const rows = await prisma.auditLog.findMany({
    ...where,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { actor: { select: { email: true, name: true } } },
  });

  const header = ["timestamp", "action", "actor_email", "actor_name", "target", "metadata"];
  const lines: string[] = [header.map(csv).join(",")];

  if (rows.length === MAX_ROWS) {
    // Comment-style row at the top so importers can spot the truncation
    // without breaking parsers (some tolerate leading `#`, others ignore
    // rows with all empty fields — we put it as a regular row in column 1).
    lines.push(
      csv(`# truncated to ${MAX_ROWS} rows — narrow the date range to see more`) + ",,,,,",
    );
  }

  for (const r of rows) {
    lines.push(
      [
        r.createdAt.toISOString(),
        r.action,
        r.actor?.email ?? "",
        r.actor?.name ?? "",
        r.target ?? "",
        r.metadata ? JSON.stringify(r.metadata) : "",
      ]
        .map(csv)
        .join(","),
    );
  }

  const body = lines.join("\n") + "\n";
  const filename = `aizorix-audit-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * Quote a value for RFC 4180-ish CSV. Always quote — simpler than detecting
 * which values need it, and the cost is one extra byte per value.
 */
function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Accept either ISO timestamp or YYYY-MM-DD. Returns null for missing or
 * unparseable values so the query simply doesn't filter on that bound.
 */
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
