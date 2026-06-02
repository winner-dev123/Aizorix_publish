/**
 * POST /api/v1/patients/{id}/erase
 *
 * GDPR Art. 17 — right to erasure ("right to be forgotten"). Hard-deletes
 * the patient AND every dependent record (conversations, messages,
 * appointments, ai-memories, handoffs) via Prisma's onDelete cascades.
 *
 * Distinct from DELETE /api/v1/patients/{id} in two ways:
 *
 *   1. Audit log records the GDPR purpose explicitly, so a future
 *      regulator audit can verify the request was honoured.
 *   2. Idempotent: deleting an already-erased patient returns 204 (not 404),
 *      because in GDPR terms the data subject's right has already been
 *      fulfilled — surfacing "not found" would imply the system still
 *      knows about them.
 *
 * The audit row itself preserves only metadata (no personal data) so we
 * can prove the erasure happened without re-introducing what was erased.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { verifyApiRequest, requireScope } from "@/server/api-auth";
import { checkApiRateLimit } from "@/server/v1-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyApiRequest(req);
  if (!auth.ok) return auth.response;
  const scopeError = requireScope(auth.ctx, "patients:write");
  if (scopeError) return scopeError;
  const rl = checkApiRateLimit(auth.ctx.token.id);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  const existing = await prisma.patient.findFirst({
    where: { id, clinicId: auth.ctx.clinicId },
    select: { id: true, firstName: true, phone: true },
  });
  if (!existing) {
    // Idempotent — see comment above.
    return new NextResponse(null, { status: 204 });
  }

  await prisma.patient.delete({ where: { id } });

  await logAudit({
    clinicId: auth.ctx.clinicId,
    actorUserId: null,
    action: "patient.gdpr_erased",
    target: `patient:${id}`,
    metadata: {
      via: `api-token:${auth.ctx.token.name}`,
      tokenId: auth.ctx.token.id,
      purpose: "GDPR Art. 17 — right to be forgotten",
      // Intentionally NOT including the patient's name/phone — the audit
      // log itself should not preserve the data we just erased.
    },
  });

  return new NextResponse(null, { status: 204 });
}
