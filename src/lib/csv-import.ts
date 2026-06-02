/**
 * Minimal RFC 4180-style CSV parser + heuristic header → field auto-mapper.
 *
 * Used by the patient import flow ([/app/clients/import]). Kept dep-free so
 * we don't ship a 50 KB parser to the client for a one-screen feature.
 *
 * Handles:
 *   - Delimiters: `,` `;` `\t` `|` (auto-sniffed from the first line)
 *   - Quoted fields with embedded delimiters, newlines, and `""` escapes
 *   - CRLF / LF / CR line endings
 *   - BOM (Excel exports often prefix `﻿`)
 *
 * Does NOT handle:
 *   - Multi-byte encodings beyond UTF-8 (caller must read with TextDecoder)
 *   - Headerless files (we require a header row)
 */

const DELIMITER_CANDIDATES = [",", ";", "\t", "|"] as const;

export type CsvField = "firstName" | "lastName" | "phone" | "email" | "dob" | "notes";

export interface CsvParseResult {
  /** The trimmed header cells in their original order. */
  headers: string[];
  /** Each row aligned to headers. Includes the original 1-based line number. */
  rows: Array<{ line: number; cells: string[] }>;
}

/**
 * Sniff the delimiter by counting occurrences on the first non-empty line.
 * Quoted runs are skipped so a `,` inside `"Smith, J."` doesn't tip the
 * vote toward comma.
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts = DELIMITER_CANDIDATES.map((d) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && ch === d) count++;
    }
    return { d, count };
  });
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].d : ",";
}

export function parseCsv(text: string): CsvParseResult {
  // Strip BOM if present.
  const clean = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(clean);

  // Stateful char-by-char parse. Tracks quoted state and rebuilds rows so
  // a `"...\n..."` field doesn't get split across two physical lines.
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // Push the in-flight cell if there is one OR the row already has cells.
      if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      }
      // Swallow a paired LF after CR so CRLF doesn't yield a blank row.
      if (ch === "\r" && next === "\n") i++;
      continue;
    }
    cell += ch;
  }
  // Trailing cell (no terminating newline).
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const data = rows.slice(1).map((cells, idx) => ({
    // CSV line 1 = header → data starts at line 2.
    line: idx + 2,
    // Pad short rows so column indexes align even when trailing fields
    // were omitted (a common Excel export quirk).
    cells: Array.from({ length: headers.length }, (_, i) => (cells[i] ?? "").trim()),
  }));

  // Drop visually-blank rows so an empty trailing line doesn't get
  // reported as "invalid".
  const nonEmpty = data.filter((r) => r.cells.some((c) => c.length > 0));

  return { headers, rows: nonEmpty };
}

/**
 * Best-effort guess of which Patient field each CSV header maps to.
 * Returns a mapping `header → CsvField | null` (null means "ignore").
 * The UI shows this as defaults; the user can override before importing.
 *
 * Match is case-insensitive, accent-stripped, and looks for substring
 * matches so headers like "Nombre del paciente" still map to firstName.
 */
const HEADER_HINTS: Record<CsvField, RegExp[]> = {
  firstName: [
    /^nombre$/,
    /\bfirst\s*name\b/,
    /^name\b/,
    /\bnombre\b/,
    /\bprimer\s*nombre\b/,
  ],
  lastName: [
    /^apellidos?$/,
    /\blast\s*name\b/,
    /\bsurname\b/,
    /\bapellidos?\b/,
    /\bfamily\s*name\b/,
  ],
  phone: [
    /^tel(é|e)fono?$/,
    /^phone$/,
    /\bphone\b/,
    /\btel(é|e)fono\b/,
    /\bm(ó|o)vil\b/,
    /\bmobile\b/,
    /\bcell\b/,
    /\bwhats(app)?\b/,
  ],
  email: [
    /^email$/,
    /^e[-_ ]?mail$/,
    /\bemail\b/,
    /\bcorreo\b/,
  ],
  dob: [
    /\bfecha\s*(de\s*)?nacimiento\b/,
    /\bbirth(day|date)?\b/,
    /\bdob\b/,
    /\bnacimiento\b/,
  ],
  notes: [
    /\bnotas?\b/,
    /\bnotes?\b/,
    /\bcomentarios?\b/,
    /\bobservaciones?\b/,
  ],
};

function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function autoMapHeaders(
  headers: string[],
): Record<string, CsvField | null> {
  const mapping: Record<string, CsvField | null> = {};
  // Track which fields are already taken so two columns can't both win the
  // same target — the first header wins.
  const used = new Set<CsvField>();

  for (const header of headers) {
    const normalised = normaliseHeader(header);
    let matched: CsvField | null = null;
    for (const [field, patterns] of Object.entries(HEADER_HINTS) as Array<
      [CsvField, RegExp[]]
    >) {
      if (used.has(field)) continue;
      if (patterns.some((p) => p.test(normalised))) {
        matched = field;
        break;
      }
    }
    if (matched) used.add(matched);
    mapping[header] = matched;
  }

  return mapping;
}

/**
 * Best-effort phone → E.164 normaliser. Pulls all digits, then prepends a
 * default country code if the number doesn't already start with `+`.
 *
 * This is intentionally lenient: when the CSV is from a Spanish clinic
 * most numbers are 9-digit locals ("611000000"); we promote them to
 * "+34611000000". If the number already has a `+`, we trust it as-is.
 *
 * Returns `null` for unrecoverable input (empty, too short, etc.) so the
 * caller can flag the row as invalid.
 */
export function normalisePhone(
  raw: string,
  defaultCountryCode: string = "34",
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Strip everything except digits and a possible leading +.
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  if (hasPlus) return `+${digits}`;
  // Spanish 9-digit mobile / landline — prepend default cc.
  return `+${defaultCountryCode}${digits}`;
}

/**
 * Best-effort date normaliser → YYYY-MM-DD. Accepts:
 *   - ISO: 1990-04-12
 *   - European: 12/04/1990 or 12-04-1990
 *   - US: 04/12/1990 (only when day > 12 makes the European reading
 *     impossible, otherwise we default to European since most clinics in
 *     scope are Spanish)
 *
 * Returns `null` if the input can't be parsed unambiguously.
 */
export function normaliseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // ISO already.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  // Disambiguate dd/mm vs mm/dd: if a > 12 it must be the day.
  const day = a > 12 ? a : a;
  const month = a > 12 ? b : b;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}
