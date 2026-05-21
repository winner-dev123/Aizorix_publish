/**
 * In-memory token-bucket rate limiter.
 *
 * Single-instance scope — buckets live in this process's memory only. For
 * Vercel / Fly / Railway single-machine deploys that's enough. If/when
 * Aizorix scales horizontally, swap this for an Upstash/Redis-backed
 * implementation; the call sites stay the same.
 *
 * Each key (e.g. a phone number) has a bucket with a fixed `capacity` and
 * refills `refillPerSec` tokens per second up to capacity. Each call
 * spends one token; if there isn't one available, the call is denied.
 */

type Bucket = {
  tokens: number;
  lastRefill: number; // ms epoch
};

const buckets = new Map<string, Bucket>();
const PRUNE_EVERY = 256; // sweep stale buckets after this many checks
let sinceLastPrune = 0;

/**
 * Returns true if a token was successfully consumed (allow the request),
 * false if the bucket was empty (reject with 429). Pure side-effects on
 * the in-memory map; safe to call from any server runtime.
 */
export function checkRateLimit(
  key: string,
  capacity: number,
  refillPerSec: number,
): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: capacity, lastRefill: now };
    buckets.set(key, b);
  }
  const elapsedSec = (now - b.lastRefill) / 1000;
  b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec);
  b.lastRefill = now;

  sinceLastPrune++;
  if (sinceLastPrune >= PRUNE_EVERY) pruneStale(now);

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

/**
 * Drop buckets that haven't been touched in 10 minutes so we don't leak
 * memory under high cardinality. Called amortized from checkRateLimit.
 */
function pruneStale(now: number) {
  sinceLastPrune = 0;
  const cutoff = now - 10 * 60 * 1000;
  for (const [key, b] of buckets) {
    if (b.lastRefill < cutoff) buckets.delete(key);
  }
}

/** Test-only: clear all buckets. */
export function resetRateLimitForTests() {
  buckets.clear();
  sinceLastPrune = 0;
}
