/**
 * GET /api/v1/technicians?active=true
 *
 * List the clinic's technicians. Read-only.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { verifyApiRequest, errorResponse, requireScope } from "@/server/api-auth";
import { checkApiRateLimit, serializeTechnician } from "@/server/v1-helpers";

const querySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "technicians:read");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    active: url.searchParams.get("active") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse(422, "validation_failed", "Invalid query params");
  }

  const rows = await prisma.technician.findMany({
    where: {
      clinicId: auth.ctx.clinicId,
      ...(parsed.data.active !== undefined
        ? { active: parsed.data.active === "true" }
        : {}),
    },
    orderBy: { name: "asc" },
    take: parsed.data.limit,
  });

  return NextResponse.json({
    data: rows.map(serializeTechnician),
    limit: parsed.data.limit,
  });
}
