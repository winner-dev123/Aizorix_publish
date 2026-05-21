/**
 * Unit tests for the in-process counter registry. Pure logic, no DB.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  incr,
  registerCounter,
  renderPrometheus,
  resetMetricsForTests,
} from "../metrics";

describe("metrics registry", () => {
  beforeEach(() => {
    resetMetricsForTests();
  });

  afterEach(() => {
    resetMetricsForTests();
  });

  it("incr creates the counter on first use and increments thereafter", () => {
    registerCounter("aizorix_test_counter", "test counter");
    incr("aizorix_test_counter");
    incr("aizorix_test_counter");
    incr("aizorix_test_counter", {}, 5);
    const out = renderPrometheus();
    expect(out).toContain("aizorix_test_counter 7");
  });

  it("groups counters by labels — same name/different labels = different buckets", () => {
    registerCounter("aizorix_webhook", "webhook total");
    incr("aizorix_webhook", { status: "200" });
    incr("aizorix_webhook", { status: "200" });
    incr("aizorix_webhook", { status: "429" });
    const out = renderPrometheus();
    expect(out).toContain('aizorix_webhook{status="200"} 2');
    expect(out).toContain('aizorix_webhook{status="429"} 1');
  });

  it("emits HELP + TYPE preambles once per metric name", () => {
    registerCounter("aizorix_orchestrate", "orchestrate runs");
    incr("aizorix_orchestrate", { outcome: "ok" });
    incr("aizorix_orchestrate", { outcome: "paused" });
    const out = renderPrometheus();
    expect(out).toContain("# HELP aizorix_orchestrate orchestrate runs");
    expect(out).toContain("# TYPE aizorix_orchestrate counter");
    // Only one HELP+TYPE per metric name even with multiple label sets.
    expect(out.match(/# HELP aizorix_orchestrate /g)?.length).toBe(1);
    expect(out.match(/# TYPE aizorix_orchestrate /g)?.length).toBe(1);
  });

  it("sorts labels alphabetically so { a:1, b:2 } and { b:2, a:1 } collide", () => {
    registerCounter("aizorix_test", "test");
    incr("aizorix_test", { b: "2", a: "1" });
    incr("aizorix_test", { a: "1", b: "2" });
    const out = renderPrometheus();
    // Should produce one line with value 2, not two lines.
    const matches = out.match(/aizorix_test\{[^}]+\} \d+/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(matches[0]).toContain("2");
  });

  it("escapes special characters in label values (double quote, backslash, newline)", () => {
    registerCounter("aizorix_messy", "msg");
    incr("aizorix_messy", { tag: 'has "quotes" and \\ slashes\nand newlines' });
    const out = renderPrometheus();
    expect(out).toContain('tag="has \\"quotes\\" and \\\\ slashes\\nand newlines"');
  });
});
