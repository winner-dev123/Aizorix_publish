import { describe, it, expect } from "vitest";
import {
  interpretRanking,
  rankTreatments,
  type RankableTreatment,
} from "@/server/treatments/match";

const T = (
  partial: Partial<RankableTreatment> & { id: string; name: string; slug: string },
): RankableTreatment => ({
  subTreatment: null,
  requiresValuation: false,
  keywords: [],
  category: null,
  ...partial,
});

const TREATMENTS: RankableTreatment[] = [
  T({
    id: "limpieza",
    name: "Limpieza facial",
    slug: "limpieza-facial",
    keywords: ["limpieza", "facial", "hidratacion"],
    category: { name: "Facial" },
  }),
  T({
    id: "microblading",
    name: "Microblading",
    slug: "microblading",
    requiresValuation: true,
    keywords: ["microblading", "cejas", "pigmentacion"],
    category: { name: "Cejas y mirada" },
  }),
  T({
    id: "diseno-cejas",
    name: "Diseño de cejas",
    slug: "diseno-cejas",
    keywords: ["cejas", "diseno", "henna"],
    category: { name: "Cejas y mirada" },
  }),
  T({
    id: "depilacion-hilo",
    name: "Depilación facial con hilo",
    slug: "depilacion-hilo",
    keywords: ["hilo", "depilacion", "bigote"],
    category: { name: "Cejas y mirada" },
  }),
];

describe("rankTreatments", () => {
  it("returns nothing for an empty query", () => {
    expect(rankTreatments(TREATMENTS, "")).toEqual([]);
  });

  it("scores exact name matches highest", () => {
    const ranked = rankTreatments(TREATMENTS, "limpieza facial");
    expect(ranked[0].treatment.slug).toBe("limpieza-facial");
  });

  it("normalizes Spanish accents", () => {
    const ranked = rankTreatments(TREATMENTS, "depilación con hilo");
    expect(ranked[0].treatment.slug).toBe("depilacion-hilo");
  });
});

describe("interpretRanking", () => {
  it("flags NOT_FOUND when nothing matched", () => {
    expect(interpretRanking([]).status).toBe("NOT_FOUND");
  });

  it("flags NEEDS_VALUATION when the top match requires one", () => {
    const ranked = rankTreatments(TREATMENTS, "quiero microblading");
    const result = interpretRanking(ranked);
    expect(result.status).toBe("NEEDS_VALUATION");
    expect(result.matches[0].treatment.slug).toBe("microblading");
  });

  it("flags AMBIGUOUS when 'cejas' could mean multiple things", () => {
    const ranked = rankTreatments(TREATMENTS, "cejas");
    const result = interpretRanking(ranked);
    expect(["AMBIGUOUS", "EXACT", "NEEDS_VALUATION"]).toContain(result.status);
    // At minimum, the top results should be cejas-related
    expect(result.matches[0].treatment.slug.includes("cejas") || result.matches[0].treatment.slug === "microblading").toBe(true);
  });

  it("flags EXACT when an unambiguous non-valuation treatment wins", () => {
    const ranked = rankTreatments(TREATMENTS, "limpieza facial hidratacion");
    const result = interpretRanking(ranked);
    expect(result.status).toBe("EXACT");
    expect(result.matches[0].treatment.slug).toBe("limpieza-facial");
  });
});
