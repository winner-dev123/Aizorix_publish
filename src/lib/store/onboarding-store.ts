"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BusinessInfo {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  instagram: string;
  facebook: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  openHour: string;
  closeHour: string;
  weekdays: string[];
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  services: string[];
}

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  category: string;
  gender: "all" | "men" | "women";
  description?: string;
}

/**
 * One document uploaded by the user during onboarding step 4 ("Entrena tu
 * IA"). The text is extracted client-side for plain-text formats (txt/md/
 * csv/json/html/xml/log); for binary formats (pdf/docx) the file is
 * accepted with status="pending" — the user is shown a fallback notice
 * and can paste the key content into `additionalNotes`.
 *
 * Stored in-memory inside the zustand-persisted state, so refreshing the
 * page keeps the documents around until the user activates the system.
 * Sent to the server at activation time and concatenated into the
 * clinic's `aiGuidance` field.
 */
export interface AIDocument {
  id: string;
  name: string;
  /** Size in bytes — used for the human-readable label. */
  size: number;
  /** MIME type as reported by the browser. May be empty for some types. */
  mime: string;
  /** Lowercased filename extension, used to drive the icon + extraction path. */
  ext: string;
  /** Extraction status. */
  status: "ready" | "pending" | "error";
  /** Extracted plain text (only for text-based formats). */
  text?: string;
  /** Word count of the extracted text — purely informational. */
  wordCount?: number;
  /** Reason the file couldn't be processed (status="error"). */
  error?: string;
  /** Epoch ms — used to sort the list. */
  addedAt: number;
}

export interface AIConfig {
  tone: "professional" | "friendly" | "casual";
  introMessage: string;
  askEmailForNew: boolean;
  pushBooking: boolean;
  language: "es" | "en";
  /** Documents uploaded during onboarding. Used to "train" the AI. */
  documents: AIDocument[];
  /** Free-text notes — the AI will see this verbatim. Persisted into the
   * clinic's aiGuidance at activation time. */
  additionalNotes: string;
}

export interface OnboardingState {
  step: number;
  sectorId: string | null;
  business: BusinessInfo;
  locations: Location[];
  employees: Employee[];
  services: Service[];
  modules: string[];
  channels: { whatsapp: boolean; instagram: boolean; facebook: boolean; googleCalendar: boolean; webForm: boolean };
  agenda: { slotMin: number; bufferMin: number; allowSameDay: boolean; reminders: boolean };
  ai: AIConfig;
  leadStates: string[];
  finished: boolean;

  setStep: (n: number) => void;
  setSector: (id: string) => void;
  setBusiness: (b: Partial<BusinessInfo>) => void;
  setLocations: (l: Location[]) => void;
  setEmployees: (e: Employee[]) => void;
  setServices: (s: Service[]) => void;
  setModules: (m: string[]) => void;
  toggleModule: (id: string) => void;
  setChannels: (c: Partial<OnboardingState["channels"]>) => void;
  setAgenda: (a: Partial<OnboardingState["agenda"]>) => void;
  setAI: (a: Partial<AIConfig>) => void;
  addAIDocument: (doc: AIDocument) => void;
  updateAIDocument: (id: string, patch: Partial<AIDocument>) => void;
  removeAIDocument: (id: string) => void;
  setLeadStates: (s: string[]) => void;
  finish: () => void;
  reset: () => void;
}

const DEFAULT_LEAD_STATES = [
  "Nuevo",
  "Contactado",
  "Interesado",
  "Cita agendada",
  "Cliente",
  "Inactivo",
];

const initial: Omit<
  OnboardingState,
  | "setStep"
  | "setSector"
  | "setBusiness"
  | "setLocations"
  | "setEmployees"
  | "setServices"
  | "setModules"
  | "toggleModule"
  | "setChannels"
  | "setAgenda"
  | "setAI"
  | "addAIDocument"
  | "updateAIDocument"
  | "removeAIDocument"
  | "setLeadStates"
  | "finish"
  | "reset"
> = {
  step: 1,
  sectorId: null,
  business: {
    name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    instagram: "",
    facebook: "",
  },
  locations: [],
  employees: [],
  services: [],
  modules: ["crm", "agenda"],
  channels: {
    whatsapp: true,
    instagram: false,
    facebook: false,
    googleCalendar: true,
    webForm: false,
  },
  agenda: { slotMin: 30, bufferMin: 10, allowSameDay: true, reminders: true },
  ai: {
    tone: "professional",
    introMessage:
      "¡Hola! Soy la asistente virtual de la clínica. ¿En qué puedo ayudarte?",
    askEmailForNew: true,
    pushBooking: true,
    language: "es",
    documents: [],
    additionalNotes: "",
  },
  leadStates: DEFAULT_LEAD_STATES,
  finished: false,
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (n) => set({ step: n }),
      setSector: (id) => set({ sectorId: id }),
      setBusiness: (b) => set({ business: { ...get().business, ...b } }),
      setLocations: (l) => set({ locations: l }),
      setEmployees: (e) => set({ employees: e }),
      setServices: (s) => set({ services: s }),
      setModules: (m) => set({ modules: m }),
      toggleModule: (id) => {
        const cur = get().modules;
        set({
          modules: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
        });
      },
      setChannels: (c) => set({ channels: { ...get().channels, ...c } }),
      setAgenda: (a) => set({ agenda: { ...get().agenda, ...a } }),
      setAI: (a) => set({ ai: { ...get().ai, ...a } }),
      addAIDocument: (doc) =>
        set({ ai: { ...get().ai, documents: [...get().ai.documents, doc] } }),
      updateAIDocument: (id, patch) =>
        set({
          ai: {
            ...get().ai,
            documents: get().ai.documents.map((d) =>
              d.id === id ? { ...d, ...patch } : d,
            ),
          },
        }),
      removeAIDocument: (id) =>
        set({
          ai: {
            ...get().ai,
            documents: get().ai.documents.filter((d) => d.id !== id),
          },
        }),
      setLeadStates: (s) => set({ leadStates: s }),
      finish: () => set({ finished: true }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "aizorix-onboarding",
      // v2 introduced `ai.documents` and `ai.additionalNotes`. Older
      // persisted state has an `ai` block without those keys, which would
      // crash StepAI when it calls `ai.documents.some(...)`. Bumping the
      // version + supplying a `merge` deep-merger backfills any missing
      // nested defaults from `initial` so old browsers stay compatible.
      version: 2,
      // Required when `version` is bumped — zustand discards the persisted
      // state otherwise. We simply pass it through; `merge` below fills in
      // any new defaults that the older shape was missing.
      migrate: (persisted) => persisted as OnboardingState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingState>;
        return {
          ...current,
          ...p,
          business: { ...current.business, ...(p.business ?? {}) },
          channels: { ...current.channels, ...(p.channels ?? {}) },
          agenda: { ...current.agenda, ...(p.agenda ?? {}) },
          ai: {
            ...current.ai,
            ...(p.ai ?? {}),
            documents: p.ai?.documents ?? current.ai.documents,
            additionalNotes:
              p.ai?.additionalNotes ?? current.ai.additionalNotes,
          },
        };
      },
    },
  ),
);
