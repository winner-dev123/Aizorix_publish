import { NextResponse } from "next/server";

/**
 * Public build-info endpoint. Used by:
 *  - on-call when verifying which build is in production
 *  - external uptime checks that want a static, cacheable response
 *  - the user themselves before opening a bug report
 *
 * Sources, in priority order:
 *   - process.env.BUILD_VERSION           // set explicitly by your deploy pipeline
 *   - process.env.VERCEL_GIT_COMMIT_SHA   // auto-populated on Vercel
 *   - process.env.npm_package_version     // package.json "version"
 *   - "dev"                                // local
 *
 * Intentionally NOT gated by METRICS_AUTH_TOKEN — the response carries no
 * secrets, only the deployed-version string and a few harmless runtime
 * facts. If you want to hide it anyway, set `VERSION_AUTH_TOKEN` in env
 * and re-add the bearer check from /api/metrics here.
 */
export async function GET() {
  const version =
    process.env.BUILD_VERSION?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.npm_package_version?.trim() ||
    "dev";

  // Empty string env vars (set but blank, e.g. unset in dev .env) should
  // report as null, not "" — easier for downstream consumers.
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;

  return NextResponse.json(
    {
      version,
      gitSha,
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? "unknown",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // Short cache so a refresh after deploy shows the new value quickly,
        // but external uptime checks don't pound the function.
        "cache-control": "public, max-age=30",
      },
    },
  );
}
