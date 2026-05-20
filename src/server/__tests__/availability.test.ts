import { describe, it, expect } from "vitest";
import { generateSlots, rangesOverlap } from "@/server/availability/slots";
import {
  isWithinBusinessHours,
  resolveWindowsForRange,
} from "@/server/availability/business-hours";

// Helper: ISO date in UTC.
const d = (iso: string) => new Date(iso.endsWith("Z") ? iso : iso + ":00Z");

describe("rangesOverlap", () => {
  it("detects clear overlap", () => {
    expect(
      rangesOverlap(
        d("2026-05-21T10:00"),
        d("2026-05-21T11:00"),
        d("2026-05-21T10:30"),
        d("2026-05-21T11:30"),
      ),
    ).toBe(true);
  });

  it("treats touching ranges as non-overlapping", () => {
    expect(
      rangesOverlap(
        d("2026-05-21T10:00"),
        d("2026-05-21T11:00"),
        d("2026-05-21T11:00"),
        d("2026-05-21T12:00"),
      ),
    ).toBe(false);
  });

  it("detects fully-contained range", () => {
    expect(
      rangesOverlap(
        d("2026-05-21T09:00"),
        d("2026-05-21T13:00"),
        d("2026-05-21T10:00"),
        d("2026-05-21T11:00"),
      ),
    ).toBe(true);
  });
});

describe("generateSlots", () => {
  const base = {
    treatmentDurationMinutes: 60,
    granularityMinutes: 30,
    technicianIds: ["t1"],
    existingAppointments: [],
    blocked: [],
    now: d("2026-05-20T08:00"),
    minLeadMinutes: 0,
  };

  it("generates evenly-spaced slots within a single window", () => {
    const slots = generateSlots({
      ...base,
      windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T12:00") }],
    });

    expect(slots.map((s) => s.startsAt.toISOString())).toEqual([
      "2026-05-21T09:00:00.000Z",
      "2026-05-21T09:30:00.000Z",
      "2026-05-21T10:00:00.000Z",
      "2026-05-21T10:30:00.000Z",
      "2026-05-21T11:00:00.000Z",
    ]);
  });

  it("skips slots that overlap existing appointments for the same technician", () => {
    const slots = generateSlots({
      ...base,
      windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T12:00") }],
      existingAppointments: [
        {
          startsAt: d("2026-05-21T10:00"),
          endsAt: d("2026-05-21T11:00"),
          technicianId: "t1",
        },
      ],
    });
    const starts = slots.map((s) => s.startsAt.toISOString());
    expect(starts).not.toContain("2026-05-21T09:30:00.000Z");
    expect(starts).not.toContain("2026-05-21T10:00:00.000Z");
    expect(starts).not.toContain("2026-05-21T10:30:00.000Z");
    expect(starts).toContain("2026-05-21T11:00:00.000Z");
  });

  it("does not touch other technicians' availability", () => {
    const slots = generateSlots({
      ...base,
      technicianIds: ["t1", "t2"],
      windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T11:00") }],
      existingAppointments: [
        {
          startsAt: d("2026-05-21T09:00"),
          endsAt: d("2026-05-21T10:00"),
          technicianId: "t1",
        },
      ],
    });
    const t1Slots = slots.filter((s) => s.technicianId === "t1").map((s) => s.startsAt.toISOString());
    const t2Slots = slots.filter((s) => s.technicianId === "t2").map((s) => s.startsAt.toISOString());
    expect(t1Slots).toEqual(["2026-05-21T10:00:00.000Z"]);
    expect(t2Slots).toEqual(["2026-05-21T09:00:00.000Z", "2026-05-21T09:30:00.000Z", "2026-05-21T10:00:00.000Z"]);
  });

  it("skips clinic-wide blocked slots for every technician", () => {
    const slots = generateSlots({
      ...base,
      technicianIds: ["t1", "t2"],
      windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T12:00") }],
      blocked: [
        {
          startsAt: d("2026-05-21T10:00"),
          endsAt: d("2026-05-21T11:00"),
          technicianId: null,
        },
      ],
    });
    expect(slots.some((s) => s.startsAt.toISOString() === "2026-05-21T10:00:00.000Z")).toBe(false);
  });

  it("respects technician-specific blocked slots", () => {
    const slots = generateSlots({
      ...base,
      technicianIds: ["t1", "t2"],
      windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T11:00") }],
      blocked: [
        {
          startsAt: d("2026-05-21T09:00"),
          endsAt: d("2026-05-21T10:00"),
          technicianId: "t1",
        },
      ],
    });
    const t1Slots = slots.filter((s) => s.technicianId === "t1");
    const t2Slots = slots.filter((s) => s.technicianId === "t2");
    expect(t1Slots.map((s) => s.startsAt.toISOString())).toEqual(["2026-05-21T10:00:00.000Z"]);
    expect(t2Slots.length).toBe(3);
  });

  it("respects minimum lead time", () => {
    const slots = generateSlots({
      ...base,
      windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T12:00") }],
      now: d("2026-05-21T08:30"),
      minLeadMinutes: 120,
    });
    expect(slots[0].startsAt.toISOString()).toBe("2026-05-21T10:30:00.000Z");
  });

  it("does not allow slots spanning across a midday break", () => {
    const slots = generateSlots({
      ...base,
      windows: [
        { opensAt: d("2026-05-21T09:30"), closesAt: d("2026-05-21T14:00") },
        { opensAt: d("2026-05-21T16:30"), closesAt: d("2026-05-21T20:00") },
      ],
    });
    const starts = slots.map((s) => s.startsAt.toISOString());
    // 13:30 → 14:30 would cross the break, must be absent
    expect(starts).not.toContain("2026-05-21T13:30:00.000Z");
    // 13:00 → 14:00 fits exactly in the morning window
    expect(starts).toContain("2026-05-21T13:00:00.000Z");
    // 16:30 should be the first afternoon slot
    expect(starts).toContain("2026-05-21T16:30:00.000Z");
    // 19:00 → 20:00 is the last afternoon slot
    expect(starts).toContain("2026-05-21T19:00:00.000Z");
    expect(starts).not.toContain("2026-05-21T19:30:00.000Z");
  });

  it("returns empty when no technicians are eligible", () => {
    expect(
      generateSlots({
        ...base,
        technicianIds: [],
        windows: [{ opensAt: d("2026-05-21T09:00"), closesAt: d("2026-05-21T12:00") }],
      }),
    ).toEqual([]);
  });
});

describe("resolveWindowsForRange (Europe/Madrid DST-aware)", () => {
  it("expands per-day windows in clinic timezone", () => {
    // May 18 2026 = Monday; May 22 = Friday. Madrid is CEST (UTC+2) on these dates.
    const windows = resolveWindowsForRange({
      from: d("2026-05-18T00:00"), // 02:00 Madrid Monday
      to: d("2026-05-22T22:00"), // 00:00 Madrid Saturday
      timezone: "Europe/Madrid",
      rows: [
        { dayOfWeek: 1, opensAt: "09:30", closesAt: "20:00" },
        { dayOfWeek: 5, opensAt: "09:30", closesAt: "20:00" },
      ],
    });
    // Monday + Friday = 2 windows
    expect(windows.length).toBe(2);
    // 09:30 Madrid CEST = 07:30 UTC
    expect(windows[0].opensAt.toISOString()).toBe("2026-05-18T07:30:00.000Z");
    expect(windows[0].closesAt.toISOString()).toBe("2026-05-18T18:00:00.000Z");
  });

  it("returns multiple windows per day for split shifts", () => {
    const windows = resolveWindowsForRange({
      from: d("2026-05-19T00:00"), // Tuesday
      to: d("2026-05-19T23:00"),
      timezone: "Europe/Madrid",
      rows: [
        { dayOfWeek: 2, opensAt: "09:30", closesAt: "14:00" },
        { dayOfWeek: 2, opensAt: "16:30", closesAt: "20:00" },
      ],
    });
    expect(windows.length).toBe(2);
  });

  it("skips days with no rules (Sundays)", () => {
    const windows = resolveWindowsForRange({
      from: d("2026-05-24T00:00"), // Sunday
      to: d("2026-05-24T23:00"),
      timezone: "Europe/Madrid",
      rows: [{ dayOfWeek: 1, opensAt: "09:30", closesAt: "20:00" }],
    });
    expect(windows).toEqual([]);
  });
});

describe("isWithinBusinessHours", () => {
  const windows = [
    { opensAt: d("2026-05-21T07:30"), closesAt: d("2026-05-21T12:00") },
    { opensAt: d("2026-05-21T14:30"), closesAt: d("2026-05-21T18:00") },
  ];

  it("accepts a fully-contained range", () => {
    expect(
      isWithinBusinessHours(d("2026-05-21T10:00"), d("2026-05-21T11:00"), windows),
    ).toBe(true);
  });

  it("rejects a range that crosses a break", () => {
    expect(
      isWithinBusinessHours(d("2026-05-21T11:30"), d("2026-05-21T15:00"), windows),
    ).toBe(false);
  });

  it("rejects a range that starts before open", () => {
    expect(
      isWithinBusinessHours(d("2026-05-21T07:00"), d("2026-05-21T08:00"), windows),
    ).toBe(false);
  });
});
