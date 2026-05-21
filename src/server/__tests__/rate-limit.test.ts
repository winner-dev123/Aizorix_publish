/**
 * Unit tests for the in-memory token-bucket rate limiter.
 * Pure logic, no DB, no time-based flakiness — uses vi.useFakeTimers to
 * advance the clock deterministically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimitForTests } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRateLimitForTests();
  });

  it("allows up to `capacity` calls in a burst, then denies", () => {
    const key = "test-key";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 1)).toBe(true);
    }
    expect(checkRateLimit(key, 5, 1)).toBe(false);
  });

  it("refills tokens over time", () => {
    const key = "refill-key";
    // Drain the bucket.
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 1);
    expect(checkRateLimit(key, 3, 1)).toBe(false);

    // Advance 2 seconds at 1 token/sec → 2 tokens should be available.
    vi.advanceTimersByTime(2000);
    expect(checkRateLimit(key, 3, 1)).toBe(true);
    expect(checkRateLimit(key, 3, 1)).toBe(true);
    expect(checkRateLimit(key, 3, 1)).toBe(false);
  });

  it("caps refill at capacity (no infinite accumulation)", () => {
    const key = "cap-key";
    // Drain just one token.
    checkRateLimit(key, 2, 1);
    // Advance an hour — should still cap at capacity=2.
    vi.advanceTimersByTime(3600 * 1000);
    expect(checkRateLimit(key, 2, 1)).toBe(true);
    expect(checkRateLimit(key, 2, 1)).toBe(true);
    expect(checkRateLimit(key, 2, 1)).toBe(false);
  });

  it("isolates buckets per key", () => {
    expect(checkRateLimit("a", 1, 0.1)).toBe(true);
    expect(checkRateLimit("a", 1, 0.1)).toBe(false);
    // Key "b" has its own bucket.
    expect(checkRateLimit("b", 1, 0.1)).toBe(true);
  });
});
