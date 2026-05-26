import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

/**
 * Liveness probe + deployment diagnostic. Public (no auth) so you can open
 * it in a browser to see exactly why production (or the AI) is failing:
 *
 *   https://your-site.netlify.app/api/health
 *
 * `status` stays tied to Postgres reachability (200 ok / 503 degraded) so
 * uptime checks keep working. The extra `env` / `clinics` / `hints` fields
 * report — WITHOUT leaking secret values — whether required env vars are
 * present, whether DATABASE_URL still points at localhost (the #1 Netlify
 * mistake), and whether the demo clinic was seeded. Read `hints` first.
 *
 * Keep it cheap: one SELECT 1 + one count. No writes.
 */

function dbHost(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/@([^/:]+)(?::(\d+))?/);
  return m ? `${m[1]}${m[2] ? ":" + m[2] : ""}` : null;
}

export async function GET() {
  const startedAt = Date.now();

  const host = dbHost(process.env.DATABASE_URL);
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    dbHost: host,
    dbIsLocalhost: host ? /^(localhost|127\.0\.0\.1)/.test(host) : null,
  };

  let db: "ok" | "error" = "error";
  let dbError: string | null = null;
  let clinics: number | null = null;
  let demoClinic: boolean | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "ok";
    clinics = await prisma.clinic.count();
    const demoSlug = process.env.DEMO_CLINIC_SLUG ?? "bellem";
    demoClinic = (await prisma.clinic.count({ where: { slug: demoSlug } })) > 0;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown";
  }

  const hints: string[] = [];
  if (!env.DATABASE_URL) hints.push("DATABASE_URL is missing in the deploy env.");
  if (env.dbIsLocalhost)
    hints.push(
      "DATABASE_URL points to localhost — a cloud host (Netlify) can't reach it. Use a hosted Postgres (Neon/Supabase) pooled URL.",
    );
  if (!env.OPENAI_API_KEY)
    hints.push("OPENAI_API_KEY is missing — the AI cannot run (orchestrate throws).");
  if (!env.AUTH_SECRET) hints.push("AUTH_SECRET is missing — auth will fail.");
  if (db === "error")
    hints.push(`Postgres unreachable: ${dbError ?? "unknown"}.`);
  if (db === "ok" && (clinics ?? 0) === 0)
    hints.push("Database has no clinics — run the seed against the hosted DB.");
  if (db === "ok" && (clinics ?? 0) > 0 && demoClinic === false)
    hints.push("Demo clinic not found — set DEMO_CLINIC_SLUG or seed `bellem`.");

  // `status` reflects DB reachability only (keeps the uptime contract). Use
  // `hints` for the full readiness picture.
  const ok = db === "ok";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      db,
      ...(dbError ? { error: dbError } : {}),
      env,
      clinics,
      demoClinic,
      hints: hints.length ? hints : ["All checks passed."],
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
