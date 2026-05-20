/**
 * Regression for the LLM timezone bug: when the model emits a naive ISO
 * string ("2026-05-26T10:00:00"), the tool boundary must treat it as
 * clinic-local time (Europe/Madrid) and convert to UTC — not pass it
 * through as if it were UTC.
 *
 * We exercise the helper indirectly by exporting it from a fixture so we
 * don't have to leak it from tools.ts.
 */
import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";

function parseClinicTime(iso: string, timezone: string): Date {
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  if (hasZone) return new Date(iso);
  return fromZonedTime(iso, timezone);
}

describe("parseClinicTime", () => {
  it("interprets a naive ISO as Madrid local time during CEST", () => {
    // 26 May 2026 is CEST (UTC+2), so 10:00 Madrid = 08:00 UTC.
    const d = parseClinicTime("2026-05-26T10:00:00", "Europe/Madrid");
    expect(d.toISOString()).toBe("2026-05-26T08:00:00.000Z");
  });

  it("interprets a naive ISO as Madrid local time during CET (winter)", () => {
    // 26 January 2026 is CET (UTC+1), so 10:00 Madrid = 09:00 UTC.
    const d = parseClinicTime("2026-01-26T10:00:00", "Europe/Madrid");
    expect(d.toISOString()).toBe("2026-01-26T09:00:00.000Z");
  });

  it("passes through Z-suffixed UTC unchanged", () => {
    const d = parseClinicTime("2026-05-26T08:00:00Z", "Europe/Madrid");
    expect(d.toISOString()).toBe("2026-05-26T08:00:00.000Z");
  });

  it("passes through ISO with explicit offset", () => {
    const d = parseClinicTime("2026-05-26T10:00:00+02:00", "Europe/Madrid");
    expect(d.toISOString()).toBe("2026-05-26T08:00:00.000Z");
  });
});
