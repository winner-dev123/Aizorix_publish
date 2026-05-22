/**
 * Unit tests for buildSystemPrompt. Pure function, no DB. Covers the tone
 * and guidance branches added in Phase 6.2 plus the unchanged default.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROMPT_TEMPLATE,
  buildSystemPrompt,
  renderPromptTemplate,
} from "../prompt";

const BASE = {
  clinic: { name: "Test Clinic", timezone: "Europe/Madrid" as const },
  externalChatId: "+34611000000",
  patientId: null,
  patientFirstName: null,
  memories: [],
  nowISO: "2026-05-20T10:00:00Z",
};

describe("buildSystemPrompt", () => {
  it("emits the neutral tone line by default (no aiTone set)", () => {
    const p = buildSystemPrompt(BASE);
    expect(p).toContain("Usa un tono cercano pero profesional");
    expect(p).not.toContain("INSTRUCCIONES ADICIONALES");
  });

  it("emits FORMAL tone line when aiTone is FORMAL", () => {
    const p = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiTone: "FORMAL" },
    });
    expect(p).toContain("Trata al paciente de usted");
    expect(p).not.toContain("Trata al paciente de tú");
  });

  it("emits CASUAL tone line when aiTone is CASUAL", () => {
    const p = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiTone: "CASUAL" },
    });
    expect(p).toContain("Trata al paciente de tú");
    expect(p).not.toContain("usted en todo momento");
  });

  it("treats NEUTRAL the same as no aiTone", () => {
    const a = buildSystemPrompt(BASE);
    const b = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiTone: "NEUTRAL" },
    });
    expect(a).toBe(b);
  });

  it("includes the INSTRUCCIONES ADICIONALES block when aiGuidance is set", () => {
    const p = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiGuidance: "Los martes hay -20% en limpieza facial." },
    });
    expect(p).toContain("INSTRUCCIONES ADICIONALES DE LA CLÍNICA");
    expect(p).toContain("Los martes hay -20% en limpieza facial.");
  });

  it("omits the INSTRUCCIONES block when aiGuidance is null or empty/whitespace", () => {
    const a = buildSystemPrompt({ ...BASE, clinic: { ...BASE.clinic, aiGuidance: null } });
    const b = buildSystemPrompt({ ...BASE, clinic: { ...BASE.clinic, aiGuidance: "" } });
    const c = buildSystemPrompt({ ...BASE, clinic: { ...BASE.clinic, aiGuidance: "   \n\t  " } });
    expect(a).not.toContain("INSTRUCCIONES ADICIONALES");
    expect(b).not.toContain("INSTRUCCIONES ADICIONALES");
    expect(c).not.toContain("INSTRUCCIONES ADICIONALES");
  });

  it("trims whitespace around aiGuidance before injecting", () => {
    const p = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiGuidance: "  Pide siempre el DNI.  \n" },
    });
    // The exact line should be the trimmed version; assert no leading/trailing
    // whitespace by checking the literal trimmed string appears.
    expect(p).toContain("\nPide siempre el DNI.");
    expect(p).not.toContain("  Pide siempre el DNI.");
  });

  it("injects patientNotes as 'Notas internas del equipo' when present", () => {
    const p = buildSystemPrompt({
      ...BASE,
      patientNotes: "Siempre con Diana. Alérgica a la lidocaína.",
    });
    expect(p).toContain("Notas internas del equipo");
    expect(p).toContain("Siempre con Diana. Alérgica a la lidocaína.");
    expect(p).toContain("no las cites textualmente al paciente");
  });

  it("omits the notes block when patientNotes is null/empty/whitespace", () => {
    const a = buildSystemPrompt({ ...BASE, patientNotes: null });
    const b = buildSystemPrompt({ ...BASE, patientNotes: "" });
    const c = buildSystemPrompt({ ...BASE, patientNotes: "   \n  " });
    expect(a).not.toContain("Notas internas del equipo");
    expect(b).not.toContain("Notas internas del equipo");
    expect(c).not.toContain("Notas internas del equipo");
  });

  it("trims whitespace around patientNotes before injecting", () => {
    const p = buildSystemPrompt({
      ...BASE,
      patientNotes: "  Viene con su madre.  ",
    });
    expect(p).toContain("\n  Viene con su madre.\n");
    expect(p).not.toContain("  Viene con su madre.  ");
  });

  it("uses DEFAULT_PROMPT_TEMPLATE when aiSystemPrompt is null/undefined", () => {
    const a = buildSystemPrompt(BASE);
    const b = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiSystemPrompt: null },
    });
    expect(a).toBe(b);
  });

  it("substitutes a custom aiSystemPrompt template verbatim", () => {
    const p = buildSystemPrompt({
      ...BASE,
      clinic: {
        ...BASE.clinic,
        aiSystemPrompt:
          "Eres el bot de {{clinic_name}} en {{timezone}}. Habla así: {{tone_instructions}}",
      },
    });
    expect(p).toBe(
      "Eres el bot de Test Clinic en Europe/Madrid. Habla así: Usa un tono cercano pero profesional. Evita los emojis.",
    );
    // Make sure we did NOT also append the default — the override is the
    // ENTIRE prompt.
    expect(p).not.toContain("OBJETIVO");
    expect(p).not.toContain("MANEJO DE FECHAS");
  });

  it("treats an empty/whitespace aiSystemPrompt as 'use default'", () => {
    const a = buildSystemPrompt(BASE);
    const b = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiSystemPrompt: "" },
    });
    const c = buildSystemPrompt({
      ...BASE,
      clinic: { ...BASE.clinic, aiSystemPrompt: "   \n  \t" },
    });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("leaves unknown placeholders untouched (allows literal {{example}})", () => {
    const p = buildSystemPrompt({
      ...BASE,
      clinic: {
        ...BASE.clinic,
        aiSystemPrompt: "Hola {{clinic_name}}, valor {{not_a_real_key}} sigue ahí.",
      },
    });
    expect(p).toBe("Hola Test Clinic, valor {{not_a_real_key}} sigue ahí.");
  });
});

describe("renderPromptTemplate", () => {
  it("replaces every occurrence of a known variable", () => {
    const out = renderPromptTemplate("{{a}} + {{a}} = 2*{{a}}", { a: "1" });
    expect(out).toBe("1 + 1 = 2*1");
  });

  it("leaves unknown placeholders untouched", () => {
    const out = renderPromptTemplate("hola {{nope}}", {});
    expect(out).toBe("hola {{nope}}");
  });

  it("does not recurse on values that contain placeholders", () => {
    // Prevents an injection where a value like "{{secret}}" would expand
    // further. The String.prototype.replace approach is non-recursive.
    const out = renderPromptTemplate("{{a}}", { a: "{{b}}", b: "danger" });
    expect(out).toBe("{{b}}");
  });

  it("DEFAULT_PROMPT_TEMPLATE includes every documented placeholder", () => {
    // Hard guarantee: removing or renaming a placeholder requires updating
    // the template too. This test fails loud if the editor's "available
    // variables" list goes out of sync with the default content.
    for (const key of [
      "clinic_name",
      "timezone",
      "now",
      "tone_instructions",
      "guidance_block",
      "patient_context",
      "memory_block",
      "patient_notes_block",
    ]) {
      expect(DEFAULT_PROMPT_TEMPLATE).toContain(`{{${key}}}`);
    }
  });
});
