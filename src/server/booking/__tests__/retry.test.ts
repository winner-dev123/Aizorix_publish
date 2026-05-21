/**
 * Unit tests for withBookingRetry. Pure logic — no DB, no Prisma.
 * Verifies the retry recognizes the Postgres SSI / deadlock signatures
 * and gives up on unrelated errors.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withBookingRetry } from "../retry";
import { resetMetricsForTests, renderPrometheus } from "../../metrics";

describe("withBookingRetry", () => {
  beforeEach(() => {
    resetMetricsForTests();
  });

  afterEach(() => {
    resetMetricsForTests();
  });

  it("returns immediately when the function succeeds first try", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withBookingRetry(fn, { label: "test" });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on Postgres 'write conflict' messages", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Transaction failed due to a write conflict or a deadlock"))
      .mockResolvedValue("ok");
    const result = await withBookingRetry(fn, { label: "test", baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);

    const metrics = renderPrometheus();
    expect(metrics).toContain('aizorix_booking_retry_total{label="test"} 1');
  });

  it("retries on Postgres deadlock messages", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("deadlock detected"))
      .mockResolvedValue("ok");
    const result = await withBookingRetry(fn, { label: "test", baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on Postgres 'could not serialize access' messages", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("could not serialize access due to concurrent update"))
      .mockResolvedValue("ok");
    const result = await withBookingRetry(fn, { label: "test", baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on unrelated errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("OVERLAP_CONFLICT"));
    await expect(withBookingRetry(fn, { label: "test" })).rejects.toThrow("OVERLAP_CONFLICT");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts and rethrows the original error", async () => {
    const conflict = new Error("Transaction failed due to a write conflict or a deadlock");
    const fn = vi.fn().mockRejectedValue(conflict);
    await expect(
      withBookingRetry(fn, { label: "test", maxAttempts: 3, baseDelayMs: 1 }),
    ).rejects.toBe(conflict);
    expect(fn).toHaveBeenCalledTimes(3);

    const metrics = renderPrometheus();
    // Each retry attempt (the first 2 of 3) increments the counter.
    expect(metrics).toContain('aizorix_booking_retry_total{label="test"} 2');
  });

  it("recognizes typed Prisma error codes (P2028, 40001, 40P01)", async () => {
    const cases = ["P2028", "40001", "40P01"];
    for (const code of cases) {
      resetMetricsForTests();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = Object.assign(new Error("typed error"), { code }) as any;
      const fn = vi.fn().mockRejectedValueOnce(e).mockResolvedValue("ok");
      const result = await withBookingRetry(fn, { label: "test", baseDelayMs: 1 });
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    }
  });
});
