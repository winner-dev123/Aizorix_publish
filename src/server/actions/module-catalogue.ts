/**
 * Catalogue of feature modules a clinic can enable / disable. Plain module
 * (NOT "use server") so client components can import the catalogue too.
 *
 * Keys are stable: persisted in Clinic.activeModules. Don't rename without
 * a data migration — disabled modules referenced by removed keys would
 * silently become enabled on the next save.
 */

export type ModuleKey =
  | "pipeline"
  | "campaigns"
  | "metrics"
  | "ai-demo"
  | "agenda";

export type ModuleDefinition = {
  key: ModuleKey;
  name: string;
  description: string;
};

export const MODULE_CATALOGUE: readonly ModuleDefinition[] = [
  {
    key: "pipeline",
    name: "Pipeline",
    description: "Embudo kanban con estados de paciente/lead.",
  },
  {
    key: "campaigns",
    name: "Campañas IA",
    description: "Plantillas + cálculo de coste y conversión por segmento.",
  },
  {
    key: "metrics",
    name: "Métricas",
    description: "KPIs, embudo y rendimiento por empleado.",
  },
  {
    key: "ai-demo",
    name: "Demo del bot",
    description: "Playground interno del orquestador, con modo simulado y real.",
  },
  {
    key: "agenda",
    name: "Agenda",
    description: "Cuadro semanal de citas y panel de próximas citas.",
  },
] as const;

export const MODULE_KEYS: readonly ModuleKey[] = MODULE_CATALOGUE.map((m) => m.key);

export function isKnownModule(key: string): key is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(key);
}
