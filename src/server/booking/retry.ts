import { incr, registerCounter } from "../metrics";

registerCounter(
  "aizorix_booking_retry_total",
  "Booking transactions retried after a Postgres Serializable conflict (40001) or deadlock (40P01)",
);

/**
 * Recognize a Postgres serialization failure (40001) or deadlock (40P01),
 * surfaced by Prisma as either a known-error code or a `Transaction failed`
 * runtime message. Both are explicitly safe to retry — Postgres aborted
 * one transaction to break the conflict.
 */
function isSerializationConflict(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("Transaction failed due to a write conflict") ||
    msg.includes("could not serialize access") ||
    msg.includes("deadlock detected")
  ) {
    return true;
  }
  // Prisma also bubbles a typed code on some paths.
  const code = (err as { code?: string }).code;
  return code === "P2028" || code === "40001" || code === "40P01";
}

/**
 * Run a Serializable-isolation transaction with retry-on-conflict. Postgres
 * SSI may abort one of two truly-concurrent overlapping bookings; the right
 * recovery is to re-run the whole transaction (the second time, the rows
 * the first run wrote are committed, so the conflict can't repeat).
 *
 * Up to `maxAttempts` total attempts. Backoff is short — these conflicts
 * are race conditions, not slow services. Counter `aizorix_booking_retry_total`
 * tracks how often this fires so prod regressions are visible.
 */
export async function withBookingRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 25;
  const label = opts.label ?? "unknown";

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isSerializationConflict(err) || attempt === maxAttempts) {
        throw err;
      }
      incr("aizorix_booking_retry_total", { label });
      // Jittered exponential-ish backoff. 25ms → 50ms → 100ms with ±50% jitter.
      const delay = baseDelay * 2 ** (attempt - 1);
      const jitter = delay * (Math.random() - 0.5);
      await new Promise((r) => setTimeout(r, Math.max(0, delay + jitter)));
    }
  }
  // Unreachable: the loop either returns inside the try or throws.
  throw lastError;
}
