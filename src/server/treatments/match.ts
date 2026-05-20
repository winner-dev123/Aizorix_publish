import { prisma } from "../db";

export type RankableTreatment = {
  id: string;
  name: string;
  slug: string;
  subTreatment: string | null;
  requiresValuation: boolean;
  keywords: string[];
  category: { name: string } | null;
};

export type RankedTreatment = {
  treatment: RankableTreatment;
  score: number;
};

export type MatchStatus = "EXACT" | "AMBIGUOUS" | "NEEDS_VALUATION" | "NOT_FOUND";

export type MatchResult = {
  status: MatchStatus;
  matches: RankedTreatment[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pure scoring function: ranks treatments by token-overlap with `query`.
 * Exact phrase containment gives a strong boost. Returns only matches
 * with a positive score, descending by score.
 */
export function rankTreatments(
  treatments: RankableTreatment[],
  query: string,
): RankedTreatment[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const ranked: RankedTreatment[] = [];

  for (const t of treatments) {
    const haystack = normalize(
      [t.name, t.subTreatment ?? "", t.category?.name ?? "", ...t.keywords].join(" "),
    );

    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += token.length;
    }
    if (haystack.includes(normalizedQuery)) score += normalizedQuery.length * 2;

    if (score > 0) ranked.push({ treatment: t, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/**
 * Translates a ranked list into a {EXACT, AMBIGUOUS, NEEDS_VALUATION, NOT_FOUND}
 * decision. Treatments are ambiguous if the runner-up is within 15% of the top.
 */
export function interpretRanking(ranked: RankedTreatment[]): MatchResult {
  if (ranked.length === 0) return { status: "NOT_FOUND", matches: [] };

  const top = ranked[0];
  const second = ranked[1];
  const isAmbiguous = !!second && second.score >= top.score * 0.85;

  if (isAmbiguous) {
    return { status: "AMBIGUOUS", matches: ranked.slice(0, 5) };
  }
  if (top.treatment.requiresValuation) {
    return { status: "NEEDS_VALUATION", matches: ranked.slice(0, 5) };
  }
  return { status: "EXACT", matches: ranked.slice(0, 5) };
}

/**
 * DB-backed treatment matcher. Loads active treatments for the clinic and
 * delegates to the pure ranker.
 */
export async function matchTreatment(
  clinicId: string,
  query: string,
): Promise<MatchResult> {
  if (!query?.trim()) return { status: "NOT_FOUND", matches: [] };

  const treatments = await prisma.treatment.findMany({
    where: { clinicId, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      subTreatment: true,
      requiresValuation: true,
      keywords: true,
      category: { select: { name: true } },
    },
  });

  return interpretRanking(rankTreatments(treatments as RankableTreatment[], query));
}
