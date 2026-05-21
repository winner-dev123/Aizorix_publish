import { NextRequest } from "next/server";
import { renderPrometheus } from "@/server/metrics";

/**
 * Prometheus-exposition endpoint for scrapers (Grafana Agent, Vector,
 * Datadog OTel, etc.). Optionally gated by a bearer token from the
 * METRICS_AUTH_TOKEN env var.
 *
 * If METRICS_AUTH_TOKEN is set, callers must send `Authorization: Bearer <token>`
 * — wrong/missing token returns 404 (not 401) so the endpoint doesn't
 * even advertise itself to unauthenticated callers.
 *
 * If METRICS_AUTH_TOKEN is unset, the endpoint is open. Fine for dev /
 * private-network deploys; set the token for any deploy where /metrics
 * is reachable from the internet.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.METRICS_AUTH_TOKEN?.trim();
  if (expected) {
    const header = request.headers.get("authorization") ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (presented !== expected) {
      return new Response("Not Found", { status: 404 });
    }
  }

  return new Response(renderPrometheus(), {
    status: 200,
    headers: {
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
