/**
 * Minimal in-process counter registry, Prometheus-exposition-format output.
 *
 * Why not pull in `prom-client`? It's another runtime dependency with
 * cross-runtime quirks (works fine on Node, awkward on edge). We only
 * need counters today — a tiny purpose-built module beats a 200KB lib.
 *
 * Same scope rules as the rate limiter: single-instance in-process state.
 * Acceptable for a single-VM deploy; for horizontal scaling, swap for a
 * push-gateway or aggregating sidecar.
 */

type LabelSet = Record<string, string>;

type CounterKey = string; // canonical "name{a=\"1\",b=\"2\"}" form
type Counter = { name: string; labels: LabelSet; value: number };

const counters = new Map<CounterKey, Counter>();
const counterHelp = new Map<string, string>();

/**
 * Register a counter's HELP text. Idempotent — last registration wins.
 * Call once at module load time per metric so /metrics output carries it.
 */
export function registerCounter(name: string, help: string) {
  counterHelp.set(name, help);
}

/**
 * Increment a counter by 1 (default) or by a specified amount.
 * Counter is auto-created on first use. Labels are sorted by key in the
 * canonical key so { a:1, b:2 } and { b:2, a:1 } hash to the same bucket.
 */
export function incr(name: string, labels: LabelSet = {}, by = 1) {
  const key = canonicalKey(name, labels);
  let c = counters.get(key);
  if (!c) {
    c = { name, labels, value: 0 };
    counters.set(key, c);
  }
  c.value += by;
}

/**
 * Render the registry as Prometheus exposition text. One line per
 * counter, HELP+TYPE preambles per metric name. Stable label key order.
 */
export function renderPrometheus(): string {
  // Group counters by metric name so we emit one HELP+TYPE per name.
  const byName = new Map<string, Counter[]>();
  for (const c of counters.values()) {
    const arr = byName.get(c.name) ?? [];
    arr.push(c);
    byName.set(c.name, arr);
  }

  const lines: string[] = [];
  for (const [name, list] of [...byName.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const help = counterHelp.get(name);
    if (help) lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} counter`);
    for (const c of list.sort((a, b) => canonicalKey(a.name, a.labels).localeCompare(canonicalKey(b.name, b.labels)))) {
      lines.push(`${formatLine(c)}`);
    }
  }
  return lines.join("\n") + "\n";
}

function formatLine(c: Counter): string {
  const keys = Object.keys(c.labels).sort();
  if (keys.length === 0) return `${c.name} ${c.value}`;
  const pairs = keys.map((k) => `${k}="${escapeLabel(c.labels[k] ?? "")}"`).join(",");
  return `${c.name}{${pairs}} ${c.value}`;
}

function canonicalKey(name: string, labels: LabelSet): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return name;
  const pairs = keys.map((k) => `${k}=${JSON.stringify(labels[k] ?? "")}`).join(",");
  return `${name}{${pairs}}`;
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Test-only: clear all counters + help text. */
export function resetMetricsForTests() {
  counters.clear();
  counterHelp.clear();
}

// -----------------------------------------------------------
// Pre-registered counters (HELP text shows up in /metrics output)
// -----------------------------------------------------------

registerCounter(
  "aizorix_whatsapp_webhook_requests_total",
  "Inbound WhatsApp webhook requests partitioned by HTTP status",
);
registerCounter(
  "aizorix_orchestrate_runs_total",
  "Orchestrator invocations partitioned by outcome (ok|paused|error)",
);
registerCounter(
  "aizorix_manual_replies_total",
  "Manual staff replies sent through getWhatsAppProvider().send()",
);
registerCounter(
  "aizorix_rate_limit_denials_total",
  "Requests rejected by the in-process rate limiter, by key prefix",
);
