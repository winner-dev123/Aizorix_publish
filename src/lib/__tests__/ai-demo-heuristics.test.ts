/**
 * Unit tests for the simulated-mode heuristics used by /app/ai.
 *
 * Covers the specific regressions reported in the screenshot:
 *   - "Me llamo García y mi número…" used to capture "García y mi número…"
 *   - "Voy a arreglarme las cejas" used to match no treatment
 *   - One-shot messages with name + phone + treatment + booking intent
 *     used to not book because treatment matching failed.
 */
import { describe, expect, it } from "vitest";
import {
  detectTreatment,
  extractEmail,
  extractName,
  extractPhone,
  hasBookingIntent,
  hasConfirmation,
  parseBareNameAttempt,
  pickFresh,
  type MatchableTreatment,
} from "../ai-demo-heuristics";

const TREATMENTS: MatchableTreatment[] = [
  { id: "t1", name: "Diseño de cejas", slug: "diseno-de-cejas" },
  { id: "t2", name: "Depilación con hilo", slug: "depilacion-con-hilo" },
  { id: "t3", name: "Depilación láser", slug: "depilacion-laser" },
  { id: "t4", name: "Dermapen", slug: "dermapen" },
  { id: "t5", name: "Limpieza facial", slug: "limpieza-facial" },
];

describe("extractName", () => {
  it("captures a single first name after 'me llamo'", () => {
    expect(extractName("Me llamo García")).toBe("García");
  });

  it("does NOT slurp the rest of the sentence after 'y'", () => {
    expect(
      extractName(
        "Me llamo García y mi número de teléfono es +34276999734.",
      ),
    ).toBe("García");
  });

  it("captures first + last name when present", () => {
    expect(extractName("Soy Laura López, quiero información")).toBe("Laura López");
  });

  it("supports 'mi nombre es' anchor", () => {
    expect(extractName("Mi nombre es Ana, ¿qué tal?")).toBe("Ana");
  });

  it("returns undefined when no introduction is present", () => {
    expect(extractName("Hola, quiero información sobre depilación.")).toBeUndefined();
  });

  it("stops the capture at a comma", () => {
    expect(extractName("Me llamo Carmen, llámame mañana")).toBe("Carmen");
  });

  it("stops at 'para'/'con' stopwords", () => {
    expect(extractName("Soy Marta para una consulta")).toBe("Marta");
    expect(extractName("Me llamo Juan con apellido Pérez")).toBe("Juan");
  });
});

describe("extractPhone", () => {
  it("handles E.164", () => {
    expect(extractPhone("+34611000000")).toBe("+34611000000");
  });

  it("handles spaces and dashes inside the number", () => {
    expect(extractPhone("Mi número es +34 611 000 000")).toBe("+34611000000");
    expect(extractPhone("611-000-000")).toBe("611000000");
  });

  it("returns undefined for short numbers (false positives like 12345)", () => {
    expect(extractPhone("12345")).toBeUndefined();
  });

  it("extracts the embedded phone from a sentence", () => {
    expect(
      extractPhone(
        "Me llamo García y mi número de teléfono es +34276999734.",
      ),
    ).toBe("+34276999734");
  });
});

describe("extractEmail", () => {
  it("extracts a standard email", () => {
    expect(extractEmail("escríbeme a laura@bellem.es")).toBe("laura@bellem.es");
  });

  it("returns undefined when no email present", () => {
    expect(extractEmail("Hola, soy Laura")).toBeUndefined();
  });
});

describe("detectTreatment", () => {
  it("matches the treatment by slug substring", () => {
    expect(detectTreatment("quiero limpieza facial", TREATMENTS)?.id).toBe("t5");
  });

  it("matches via synonym group: 'cejas' → Diseño de cejas", () => {
    expect(detectTreatment("Voy a arreglarme las cejas", TREATMENTS)?.id).toBe("t1");
  });

  it("matches when the user provides a long sentence with the treatment word", () => {
    expect(
      detectTreatment(
        "Me llamo García y mi número de teléfono es +34276999734. Me gustaría que me depilaran las cejas. ¿Cuándo tengo una cita disponible?",
        TREATMENTS,
      )?.id,
    ).toBe("t1");
  });

  it("matches 'laser' to 'Depilación láser' (accent-insensitive)", () => {
    expect(detectTreatment("me interesa depilación laser", TREATMENTS)?.id).toBe(
      "t3",
    );
  });

  it("matches 'hilo' to 'Depilación con hilo'", () => {
    expect(detectTreatment("¿hacéis depilación con hilo?", TREATMENTS)?.id).toBe(
      "t2",
    );
  });

  it("matches 'dermapen' as the slug itself", () => {
    expect(detectTreatment("quiero dermapen", TREATMENTS)?.id).toBe("t4");
  });

  it("returns undefined for unrelated text", () => {
    expect(detectTreatment("Hola, ¿qué tal?", TREATMENTS)).toBeUndefined();
  });

  it("returns undefined when the treatments list is empty", () => {
    expect(detectTreatment("cejas", [])).toBeUndefined();
  });
});

describe("hasBookingIntent", () => {
  it("matches 'cita'", () => {
    expect(hasBookingIntent("¿Cuándo tengo una cita disponible?")).toBe(true);
  });
  it("matches 'reserva'", () => {
    expect(hasBookingIntent("Ya dije que haría una reserva.")).toBe(true);
  });
  it("matches 'agendar'", () => {
    expect(hasBookingIntent("Quiero agendar para mañana")).toBe(true);
  });
  it("does not match a pure information request", () => {
    expect(hasBookingIntent("¿cuánto cuesta?")).toBe(false);
  });
});

describe("hasConfirmation", () => {
  it("matches a bare 'sí'", () => {
    expect(hasConfirmation("sí")).toBe(true);
    expect(hasConfirmation("Sí, perfecto")).toBe(true);
  });
  it("matches 'vale' / 'ok' / 'perfecto'", () => {
    expect(hasConfirmation("vale")).toBe(true);
    expect(hasConfirmation("ok")).toBe(true);
    expect(hasConfirmation("perfecto, hazlo")).toBe(true);
  });
  it("does not match a question", () => {
    expect(hasConfirmation("¿a qué hora?")).toBe(false);
  });
});

describe("pickFresh", () => {
  it("returns the first option when nothing is recent", () => {
    expect(pickFresh(["A", "B", "C"], [])).toBe("A");
  });
  it("skips an option matching a recent bot turn", () => {
    expect(pickFresh(["A", "B", "C"], ["A"])).toBe("B");
  });
  it("returns the first option when every choice was used", () => {
    expect(pickFresh(["A", "B"], ["A", "B"])).toBe("A");
  });
});

describe("parseBareNameAttempt", () => {
  it("still recognises Spanish intros via extractName", () => {
    expect(parseBareNameAttempt("me llamo Sara")).toBe("Sara");
  });

  it("captures English intro 'my name is X'", () => {
    expect(parseBareNameAttempt("my name is Garcia")).toBe("Garcia");
  });

  it("captures English intro 'I'm X'", () => {
    expect(parseBareNameAttempt("I'm Laura, encantada")).toBe("Laura");
  });

  it("captures the name segment from a comma-separated list (name first)", () => {
    expect(parseBareNameAttempt("Garcia,+34345655467")).toBe("Garcia");
  });

  it("captures the name segment when the phone is first", () => {
    expect(parseBareNameAttempt("+34345655467, Garcia")).toBe("Garcia");
  });

  it("captures a multi-segment list with name + phone + treatment", () => {
    expect(parseBareNameAttempt("Garcia, +34345655467, limpieza facial")).toBe(
      "Garcia",
    );
  });

  it("captures a bare single-word name when expectingName=true", () => {
    expect(parseBareNameAttempt("Garcia", { expectingName: true })).toBe(
      "Garcia",
    );
  });

  it("captures a two-word bare name when expectingName=true", () => {
    expect(parseBareNameAttempt("Garcia gonzalez", { expectingName: true })).toBe(
      "Garcia Gonzalez",
    );
  });

  it("prettifies bare names to Title Case", () => {
    expect(parseBareNameAttempt("garcia", { expectingName: true })).toBe(
      "Garcia",
    );
    expect(parseBareNameAttempt("MARÍA jOsÉ", { expectingName: true })).toBe(
      "María José",
    );
  });

  it("refuses to treat a bare noun as a name without expectingName=true", () => {
    expect(parseBareNameAttempt("Garcia")).toBeUndefined();
    expect(parseBareNameAttempt("duración")).toBeUndefined();
  });

  it("refuses stoplist words even with expectingName=true", () => {
    for (const word of [
      "hola",
      "buenos",
      "cejas",
      "depilación",
      "cita",
      "ok",
      "gracias",
      "limpieza",
      "facial",
    ]) {
      expect(
        parseBareNameAttempt(word, { expectingName: true }),
        `should reject '${word}'`,
      ).toBeUndefined();
    }
  });

  it("refuses anything with digits or symbols", () => {
    expect(parseBareNameAttempt("+34611000000", { expectingName: true })).toBeUndefined();
    expect(parseBareNameAttempt("user@example.com", { expectingName: true })).toBeUndefined();
  });

  it("refuses messages longer than 3 words", () => {
    expect(
      parseBareNameAttempt("Garcia Gonzalez Lopez Martinez", { expectingName: true }),
    ).toBeUndefined();
  });

  it("regression: 'Garcia,+34345655467' from the user's screenshot", () => {
    // Single message providing name + phone. Previously the name was
    // dropped because no "me llamo" anchor was present.
    expect(parseBareNameAttempt("Garcia,+34345655467")).toBe("Garcia");
    expect(extractPhone("Garcia,+34345655467")).toBe("+34345655467");
  });

  it("regression: bare 'Garcia' as a reply to 'tu nombre?'", () => {
    // After the bot asked, the user typed only their surname. Without
    // expectingName, this was returning undefined. With expectingName it
    // resolves correctly.
    expect(parseBareNameAttempt("Garcia", { expectingName: true })).toBe(
      "Garcia",
    );
  });

  it("regression: 'my name is Garcia' (English fallback)", () => {
    expect(parseBareNameAttempt("my name is Garcia")).toBe("Garcia");
  });
});

describe("regression: lead persistence across turns (screenshot scenario)", () => {
  // Replays the user's reported flow:
  //  1. user mentions "depilarnos el vello facial" → treatment matched
  //  2. user types "Garcia,+34345655467" → name + phone
  //  3. all 3 fields are now in the cumulative lead — bot should NOT
  //     re-ask for anything; the BOOK gate triggers.
  it("collects treatment, name, and phone across two turns", () => {
    type Lead = { name?: string; phone?: string; treatment?: string };
    const lead: Lead = {};

    // Turn 1
    const t1 = "Estamos planeando depilarnos el vello facial.";
    const matched1 = detectTreatment(t1, TREATMENTS);
    if (matched1 && !lead.treatment) lead.treatment = matched1.name;
    expect(lead.treatment).toBeTruthy(); // matched some treatment

    // Turn 2 — comma-split provides name + phone
    const t2 = "Garcia,+34345655467";
    const phone = extractPhone(t2);
    if (phone && !lead.phone) lead.phone = phone;
    const name = parseBareNameAttempt(t2, { expectingName: !lead.name });
    if (name && !lead.name) lead.name = name;

    expect(lead.name).toBe("Garcia");
    expect(lead.phone).toBe("+34345655467");
    expect(lead.treatment).toBeTruthy();
  });

  it("recognises a bare name 'García' as the third reply when only the name is missing", () => {
    type Lead = { name?: string; phone?: string; treatment?: string };
    const lead: Lead = {
      phone: "+34611000000",
      treatment: "Limpieza facial",
    };

    const reply = "García";
    const name = parseBareNameAttempt(reply, { expectingName: !lead.name });
    if (name && !lead.name) lead.name = name;
    expect(lead.name).toBe("García");
  });
});

describe("regression: one-shot complete message", () => {
  it("extracts every field from a single multi-sentence intent message", () => {
    const text =
      "Me llamo García y mi número de teléfono es +34276999734. Me gustaría que me depilaran las cejas. ¿Cuándo tengo una cita disponible?";
    expect(extractName(text)).toBe("García");
    expect(extractPhone(text)).toBe("+34276999734");
    expect(detectTreatment(text, TREATMENTS)?.id).toBe("t1");
    expect(hasBookingIntent(text)).toBe(true);
  });
});
