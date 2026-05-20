import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { BusinessHoursRow, ResolvedWindow } from "./types";

/**
 * Iterates every calendar day (in the clinic's local timezone) that overlaps
 * the [from, to] UTC range and yields its zoned components.
 *
 * Increments by 24h in UTC using a noon anchor — robust across DST in
 * Europe/Madrid (CET/CEST) because noon never lands in a DST gap/overlap.
 */
function* iterateLocalDays(
  from: Date,
  to: Date,
  timezone: string,
): Generator<{ year: number; month: number; day: number; dow: number; dateStr: string }> {
  const fromLocal = toZonedTime(from, timezone);
  const toLocal = toZonedTime(to, timezone);

  let y = fromLocal.getFullYear();
  let m = fromLocal.getMonth();
  let d = fromLocal.getDate();
  const ey = toLocal.getFullYear();
  const em = toLocal.getMonth();
  const ed = toLocal.getDate();

  while (true) {
    const noonProbe = new Date(Date.UTC(y, m, d, 12));
    const zoned = toZonedTime(noonProbe, timezone);
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    yield {
      year: y,
      month: m,
      day: d,
      dow: zoned.getDay(),
      dateStr,
    };
    if (y === ey && m === em && d === ed) return;
    const next = new Date(Date.UTC(y, m, d + 1, 12));
    y = next.getUTCFullYear();
    m = next.getUTCMonth();
    d = next.getUTCDate();
  }
}

/**
 * Expand weekly business-hours rules into concrete UTC opening windows for
 * each calendar day inside [from, to], clipped to the requested range.
 *
 * Pure function — accepts plain data, no DB calls.
 */
export function resolveWindowsForRange(args: {
  from: Date;
  to: Date;
  timezone: string;
  rows: BusinessHoursRow[];
}): ResolvedWindow[] {
  const { from, to, timezone, rows } = args;
  if (from.getTime() >= to.getTime()) return [];

  const windows: ResolvedWindow[] = [];

  for (const day of iterateLocalDays(from, to, timezone)) {
    const rowsForDay = rows.filter((r) => r.dayOfWeek === day.dow);
    for (const row of rowsForDay) {
      const opensAt = fromZonedTime(`${day.dateStr}T${row.opensAt}:00`, timezone);
      const closesAt = fromZonedTime(`${day.dateStr}T${row.closesAt}:00`, timezone);
      if (closesAt.getTime() <= opensAt.getTime()) continue;

      const clipStart = opensAt.getTime() < from.getTime() ? from : opensAt;
      const clipEnd = closesAt.getTime() > to.getTime() ? to : closesAt;
      if (clipStart.getTime() < clipEnd.getTime()) {
        windows.push({ opensAt: clipStart, closesAt: clipEnd });
      }
    }
  }

  return windows;
}

/**
 * True iff [start, end] fits entirely inside at least one open window.
 */
export function isWithinBusinessHours(
  start: Date,
  end: Date,
  windows: ResolvedWindow[],
): boolean {
  for (const w of windows) {
    if (
      w.opensAt.getTime() <= start.getTime() &&
      w.closesAt.getTime() >= end.getTime()
    ) {
      return true;
    }
  }
  return false;
}
