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

export interface AIConfig {
  tone: "professional" | "friendly" | "casual";
  introMessage: string;
  askEmailForNew: boolean;
  pushBooking: boolean;
  language: "es" | "en";
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
      setLeadStates: (s) => set({ leadStates: s }),
      finish: () => set({ finished: true }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "aizorix-onboarding",
      version: 1,
    },
  ),
);
