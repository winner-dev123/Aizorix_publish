import { describe, it, expect } from "vitest";
import { pickTechnician, type EligibleTechRule } from "@/server/technicians/assign";

const tech = (
  id: string,
  name: string,
  partial: Partial<Omit<EligibleTechRule, "technicianId" | "technician">> & {
    prioritySensitive?: boolean;
  } = {},
): EligibleTechRule => ({
  technicianId: id,
  isPrimary: partial.isPrimary ?? false,
  isPreferred: partial.isPreferred ?? false,
  isExclusive: partial.isExclusive ?? false,
  isExcluded: partial.isExcluded ?? false,
  isFallbackOnly: partial.isFallbackOnly ?? false,
  technician: {
    id,
    name,
    active: true,
    prioritySensitive: partial.prioritySensitive ?? false,
  },
});

describe("pickTechnician", () => {
  it("returns null when there are no rules", () => {
    expect(pickTechnician([], new Set())).toBeNull();
  });

  it("respects exclusivity: only the exclusive tech may be assigned", () => {
    const result = pickTechnician(
      [
        tech("leo", "Leo", { isExclusive: true, isPrimary: true }),
        tech("diana", "Diana"),
      ],
      new Set(),
    );
    expect(result).toEqual({ technicianId: "leo", reason: "EXCLUSIVE" });
  });

  it("returns null when the exclusive tech is busy", () => {
    const result = pickTechnician(
      [tech("leo", "Leo", { isExclusive: true })],
      new Set(["leo"]),
    );
    expect(result).toBeNull();
  });

  it("honors a requested technician when they're eligible and free", () => {
    const result = pickTechnician(
      [
        tech("diana", "Diana", { isPrimary: true }),
        tech("isis", "Isis"),
      ],
      new Set(),
      "Isis",
    );
    expect(result).toEqual({ technicianId: "isis", reason: "REQUESTED" });
  });

  it("falls back to auto-assign when the requested tech is busy", () => {
    const result = pickTechnician(
      [
        tech("diana", "Diana", { isPrimary: true, isPreferred: true }),
        tech("isis", "Isis"),
      ],
      new Set(["isis"]),
      "Isis",
    );
    expect(result?.technicianId).toBe("diana");
  });

  it("filters out excluded techs", () => {
    const result = pickTechnician(
      [
        tech("leo", "Leo", { isExcluded: true }),
        tech("isis", "Isis", { isPrimary: true }),
      ],
      new Set(),
    );
    expect(result?.technicianId).toBe("isis");
  });

  it("prefers non-fallback techs over fallback-only techs", () => {
    const result = pickTechnician(
      [
        tech("leo", "Leo", { isFallbackOnly: true, prioritySensitive: true }),
        tech("diana", "Diana"),
      ],
      new Set(),
    );
    expect(result?.technicianId).toBe("diana");
  });

  it("uses a fallback-only tech when nobody else is free", () => {
    const result = pickTechnician(
      [
        tech("leo", "Leo", { isFallbackOnly: true, prioritySensitive: true }),
        tech("diana", "Diana"),
      ],
      new Set(["diana"]),
    );
    expect(result?.technicianId).toBe("leo");
    expect(result?.reason).toBe("FALLBACK");
  });

  it("ranks preferred above primary above prioritySensitive", () => {
    const result = pickTechnician(
      [
        tech("leo", "Leo", { isPrimary: true, prioritySensitive: true }),
        tech("diana", "Diana", { isPreferred: true }),
        tech("isis", "Isis"),
      ],
      new Set(),
    );
    expect(result?.technicianId).toBe("diana");
    expect(result?.reason).toBe("PREFERRED");
  });

  it("avoids prioritySensitive techs when an equivalent alternative exists", () => {
    const result = pickTechnician(
      [
        tech("leo", "Leo", { prioritySensitive: true }),
        tech("diana", "Diana"),
      ],
      new Set(),
    );
    expect(result?.technicianId).toBe("diana");
  });

  it("returns null when every candidate is busy", () => {
    const result = pickTechnician(
      [tech("leo", "Leo"), tech("diana", "Diana")],
      new Set(["leo", "diana"]),
    );
    expect(result).toBeNull();
  });
});
