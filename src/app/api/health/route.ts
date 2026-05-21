import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

/**
 * Liveness + Postgres readiness probe. Public (no auth) so load balancers
 * and uptime checks can hit it. Returns 200 when the app can reach the
 * database, 503 when it cannot.
 *
 * Keep this endpoint cheap: a single `SELECT 1` round-trip. Never add
 * DB writes here — health probes hit often.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        error: e instanceof Error ? e.message : "unknown",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
