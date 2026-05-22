/**
 * Pure heuristic helpers for the SIMULATED branch of /app/ai (the local-only
 * fallback that runs without hitting the orchestrator). Extracted so the
 * regex / matcher / response-selector logic can be unit-tested in isolation;
 * the AiDemo component imports these and wires them to React state.
 *
 * Real-mode demo conversations go through src/server/ai/orchestrate.ts —
 * this file is irrelevant to that path.
 */

export function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Words that must STOP a name capture. Spanish sentences after "me llamo X"
// often continue with " y mi teléfono…", " con apellido…", ", quiero…"; we
// stop at the first such token so we don't slurp the rest of the sentence.
const NAME_STOP_TOKENS = new Set([
  "y",
  "mi",
  "el",
  "la",
  "para",
  "con",
  "por",
  "que",
  "de",
  "me",
  "tengo",
  "soy",
  "no",
]);

/**
 * Words that are NEVER the patient's name. Used by parseBareNameAttempt
 * when the user just types a bare token instead of using a full "me llamo"
 * intro. Keep this list of common Spanish chat words / treatment keywords /
 * filler — never add an actual Spanish first name here.
 */
const NON_NAME_WORDS = new Set([
  "hola",
  "buenos",
  "buenas",
  "gracias",
  "vale",
  "ok",
  "si",
  "sí",
  "no",
  "ayuda",
  "info",
  "informacion",
  "información",
  "precio",
  "precios",
  "coste",
  "cita",
  "citas",
  "reserva",
  "reservar",
  "agenda",
  "agendar",
  "cejas",
  "ceja",
  "depilacion",
  "depilación",
  "pestanas",
  "pestañas",
  "limpieza",
  "facial",
  "laser",
  "láser",
  "hilo",
  "dermapen",
  "labios",
  "tarde",
  "manana",
  "mañana",
  "noche",
  "hoy",
  "como",
  "cómo",
  "que",
  "qué",
  "cuando",
  "cuándo",
  "donde",
  "dónde",
  "porque",
  "por qué",
  "para",
  "con",
  "claro",
  "perfecto",
  "puedes",
  "puedo",
  "quiero",
  "necesito",
  "tel",
  "telefono",
  "teléfono",
  "email",
  "correo",
  "mi",
  "tu",
  "el",
  "la",
  "los",
  "las",
  "del",
  "de",
  "una",
  "uno",
  "y",
  "o",
  "es",
  "soy",
  "estoy",
  "voy",
  "me",
  "se",
  "te",
  "a",
  "en",
  "al",
  "por",
  "muy",
  "muchas",
  "mucho",
  "muchas gracias",
  "hello",
  "hi",
  "hey",
  "thanks",
  "yes",
  "name",
]);

function prettifyName(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("es-ES") + w.slice(1).toLocaleLowerCase("es-ES"))
    .join(" ");
}

/**
 * Heuristic: does this short string look like a person's name? A name has
 * 1-3 letter-only tokens (with diacritics, hyphens, apostrophes allowed),
 * each 2-20 chars, none of which are in NON_NAME_WORDS. Returns false on
 * empty, digits, punctuation, or any flagged stoplist word.
 */
function looksLikeName(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  if (!/^[\p{L}\s'-]+$/u.test(trimmed)) return false;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 1 || tokens.length > 3) return false;
  for (const tok of tokens) {
    if (tok.length < 2 || tok.length > 20) return false;
    if (NON_NAME_WORDS.has(foldAccents(tok))) return false;
  }
  return true;
}

/**
 * Returns the patient's first name (and optionally a second word) from
 * common Spanish self-introductions:
 *   "Me llamo García"            → García
 *   "me llamo García y mi tel…"  → García         (stops at " y ")
 *   "Soy Laura López, quiero…"   → Laura López    (two-word, stops at ",")
 *   "Mi nombre es Ana Sofia"     → Ana Sofia
 *
 * Returns undefined if no recognisable pattern matches.
 */
export function extractName(text: string): string | undefined {
  // Anchor on the introduction verb, then capture letters/spaces. We stop
  // the capture ourselves token-by-token so we can drop NAME_STOP_TOKENS.
  const patterns = [
    /me llamo\s+([\p{L}\s]+?)(?=[.,;:!?]|\s+(?:y|mi|para|con|por|que|de|me|no)\b|$)/iu,
    /(?:^|\s)soy\s+([\p{L}\s]+?)(?=[.,;:!?]|\s+(?:y|mi|para|con|por|que|de|me|no)\b|$)/iu,
    /mi nombre es\s+([\p{L}\s]+?)(?=[.,;:!?]|\s+(?:y|mi|para|con|por|que|de|me|no)\b|$)/iu,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;

    const tokens = m[1].trim().split(/\s+/);
    const out: string[] = [];
    for (const tok of tokens) {
      const lower = foldAccents(tok);
      if (NAME_STOP_TOKENS.has(lower)) break;
      out.push(tok);
      // Cap at 2 tokens — "Laura López", "Ana Sofia" — anything longer is
      // almost certainly noise like "García y mi número".
      if (out.length >= 2) break;
    }
    const name = out.join(" ").trim();
    if (name) return name;
  }
  return undefined;
}

/**
 * Permissive name parser used in /app/ai when the strict `extractName`
 * returns nothing. Tries — in order —
 *
 *   1. Spanish intros via extractName ("Me llamo García", "soy Laura").
 *   2. English intros: "my name is X" / "I am X" / "I'm X" / "name: X".
 *   3. Comma- or semicolon-separated segments — ALWAYS active: if a user
 *      types "Garcia,+34...,limpieza" the comma layout is unambiguous
 *      data; we return the first segment that clears looksLikeName.
 *   4. Bare-name whole message ("Garcia" or "Garcia González") — gated on
 *      `options.expectingName`. Without that flag the parser refuses to
 *      treat a single noun as a name, so unrelated one-word messages
 *      ("duración", "Bellem", …) won't false-match.
 *
 * In the UI, set `expectingName = !leadHasName` — we're "expecting" a
 * name whenever the conversation still needs one. The stoplist
 * (NON_NAME_WORDS) catches obvious greetings/treatment terms even when
 * the gate is open.
 */
export function parseBareNameAttempt(
  text: string,
  options: { expectingName?: boolean } = {},
): string | undefined {
  const spanish = extractName(text);
  if (spanish) return spanish;

  const enPatterns = [
    /(?:my name is|i am|i'm|im|nombre:?)\s+([\p{L}]+(?:\s+[\p{L}]+)?)/iu,
    /^name\s*[:=-]\s*([\p{L}]+(?:\s+[\p{L}]+)?)/iu,
  ];
  for (const re of enPatterns) {
    const m = text.match(re);
    if (m?.[1] && looksLikeName(m[1])) return prettifyName(m[1]);
  }

  // Comma/semicolon/pipe/newline-separated segments. Safe even without
  // expectingName because the delimiter signals "this is a list of fields".
  const segments = text
    .split(/[,;\n|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length > 1) {
    for (const seg of segments) {
      if (looksLikeName(seg)) return prettifyName(seg);
    }
  }

  // Whole-message bare name. Gated to avoid parsing one-word nouns.
  if (options.expectingName && looksLikeName(text)) {
    return prettifyName(text);
  }

  return undefined;
}

/**
 * Extracts a phone number from natural text. Accepts E.164, spaced, or
 * dashed forms. Returns the normalized digits-only-prefixed-with-+ form,
 * or undefined if no candidate found.
 */
export function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?\d[\d\s\-.()]{7,18}\d)/);
  if (!m?.[1]) return undefined;
  const stripped = m[1].replace(/[\s\-.()]+/g, "");
  // Reject things like "12345" — too short to be a real phone.
  const digits = stripped.replace(/^\+/, "");
  if (digits.length < 8 || digits.length > 15) return undefined;
  return stripped;
}

export function extractEmail(text: string): string | undefined {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m?.[0];
}

/**
 * Spanish keyword groups that map to ANY treatment whose name/slug tokens
 * include one of the group members. e.g. user says "cejas" → match any
 * treatment containing "ceja"/"cejas" in its name (Diseño de cejas,
 * Microblading de cejas, …).
 *
 * Add a new group when a user keyword should match a treatment whose
 * canonical name doesn't contain that exact word — synonyms only, NOT
 * for words already present in the treatment name (those match for free
 * via direct token overlap).
 */
const TREATMENT_SYNONYMS: Record<string, string[]> = {
  cejas: ["ceja", "cejas"],
  pestanas: ["pestana", "pestanas"],
  laser: ["laser"],
  hilo: ["hilo"],
  peeling: ["peeling"],
  dermapen: ["dermapen"],
  labios: ["labio", "labios"],
  limpieza: ["limpieza"],
  hidratacion: ["hidratacion", "hidrofacial"],
  manchas: ["mancha", "manchas"],
  facial: ["facial"],
  // Aliases — left side is what the USER types, expanded to canonical
  // tokens that the treatment might contain.
  depilar: ["depilacion"],
  depilarme: ["depilacion"],
  depilen: ["depilacion"],
  depilaran: ["depilacion"],
  arreglarme: ["diseno", "perfilado"],
  arreglar: ["diseno", "perfilado"],
};

function tokenize(s: string): Set<string> {
  return new Set(
    foldAccents(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2),
  );
}

export type MatchableTreatment = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Finds the best-matching treatment for `text`. Strategy:
 *
 *   1. Direct substring of name or slug ⇒ confident hit, return immediately.
 *   2. Token overlap between user tokens and treatment tokens (name + slug
 *      tokens combined). Each direct token hit scores 2.
 *   3. Synonym expansion: a user token in a TREATMENT_SYNONYMS group adds
 *      1 point per treatment whose tokens include any other member of the
 *      same group.
 *
 * Returns the highest-scoring treatment, or undefined when nothing scored.
 * Tie-breaks by the first treatment in the input order.
 */
export function detectTreatment<T extends MatchableTreatment>(
  text: string,
  treatments: readonly T[],
): T | undefined {
  if (treatments.length === 0) return undefined;

  const haystack = foldAccents(text);
  const userTokens = tokenize(text);

  let best: T | undefined = undefined;
  let bestScore = 0;

  for (const tr of treatments) {
    const slug = foldAccents(tr.slug);
    const name = foldAccents(tr.name);
    if (slug && haystack.includes(slug)) return tr;
    if (name && name.length >= 4 && haystack.includes(name)) return tr;

    const treatTokens = new Set<string>();
    for (const t of slug.split(/[^a-z0-9]+/).filter((s) => s.length >= 2)) treatTokens.add(t);
    for (const t of name.split(/[^a-z0-9]+/).filter((s) => s.length >= 2)) treatTokens.add(t);

    let score = 0;
    for (const tok of userTokens) {
      if (treatTokens.has(tok)) {
        score += 2;
        continue;
      }
      // Synonym expansion
      const group = TREATMENT_SYNONYMS[tok];
      if (group) {
        for (const variant of group) {
          if (treatTokens.has(variant)) {
            score += 1;
            break;
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = tr;
    }
  }
  // Threshold: 2 means at least one solid token match (or two synonyms).
  // Lower thresholds produced false positives on incidental words like
  // "facial" appearing in "cara facial" descriptions.
  return bestScore >= 2 ? best : undefined;
}

/** True when the user's message asks/implies booking. */
export function hasBookingIntent(text: string): boolean {
  const t = foldAccents(text);
  // "reserv" is a prefix (matches reserva, reservar, reservas, reservada…),
  // the others are full-word matches.
  return (
    /\breserv/.test(t) ||
    /\b(cita|citas|agendar|agenda|disponibilidad)\b/.test(t) ||
    /\bcuando (puedo|tengo|hay)\b/.test(t)
  );
}

/** True when the user is confirming a previously-offered slot. */
export function hasConfirmation(text: string): boolean {
  const t = foldAccents(text).trim();
  return /^(si|vale|ok|confirm|de acuerdo|perfecto|claro|adelante|por supuesto|hazlo|reserva(lo)?|agend(a|alo))\b/.test(
    t,
  );
}

/** Spanish first-name extraction once we have a captured `name` like "García". */
export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/**
 * Picks a non-repeating phrasing from `options`, avoiding any string in
 * `recent`. If every option has been used recently, returns the first
 * option anyway (better than crashing). `recent` should be the last 2–3
 * bot turns folded to a comparable form.
 */
export function pickFresh(options: string[], recent: readonly string[]): string {
  for (const o of options) {
    if (!recent.some((r) => r.trim() === o.trim())) return o;
  }
  return options[0] ?? "";
}
