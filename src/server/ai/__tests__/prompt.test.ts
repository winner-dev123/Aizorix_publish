/**
 * Unit tests for buildSystemPrompt. Pure function, no DB. Covers the tone
 * and guidance branches added in Phase 6.2 plus the unchanged default.
 */
import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../prompt";

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
});
