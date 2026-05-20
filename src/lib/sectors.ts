import {
  Flower2,
  Syringe,
  Stethoscope,
  Home,
  Utensils,
  Wrench,
  Scissors,
  Dumbbell,
  Cross,
  PawPrint,
  Sparkles,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export interface Sector {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string; // tailwind bg class for icon badge
  modules: string[]; // default-recommended modules
}

export const SECTORS: Sector[] = [
  {
    id: "clinicas-esteticas",
    name: "Clínicas Estéticas",
    description: "Gestiona tratamientos, citas, promociones y seguimiento de clientes.",
    icon: Flower2,
    accent: "bg-ink-900",
    modules: ["crm", "agenda", "ia-receptionist", "campaigns", "whatsapp"],
  },
  {
    id: "medicina-estetica",
    name: "Medicina Estética",
    description: "Controla pacientes, citas médicas, tratamientos y seguimientos.",
    icon: Syringe,
    accent: "bg-ink-900",
    modules: ["crm", "agenda", "ia-receptionist", "campaigns", "whatsapp", "medical-history"],
  },
  {
    id: "dentistas",
    name: "Dentistas",
    description: "Gestiona consultas, tratamientos, recordatorios y fichas de pacientes.",
    icon: Stethoscope,
    accent: "bg-ink-900",
    modules: ["crm", "agenda", "ia-receptionist", "medical-history", "whatsapp"],
  },
  {
    id: "inmobiliarias",
    name: "Inmobiliarias",
    description: "Organiza clientes, propiedades, visitas y seguimiento de oportunidades.",
    icon: Home,
    accent: "bg-ink-900",
    modules: ["crm", "pipeline", "campaigns", "whatsapp"],
  },
  {
    id: "restaurantes",
    name: "Restaurantes",
    description: "Gestiona reservas, pedidos, clientes y promociones especiales.",
    icon: Utensils,
    accent: "bg-ink-900",
    modules: ["agenda", "crm", "campaigns", "whatsapp"],
  },
  {
    id: "talleres",
    name: "Talleres Mecánicos",
    description: "Controla servicios, citas, vehículos y seguimiento de clientes.",
    icon: Wrench,
    accent: "bg-ink-900",
    modules: ["crm", "agenda", "whatsapp", "campaigns"],
  },
  {
    id: "peluquerias",
    name: "Peluquerías y Barberías",
    description: "Gestiona citas, servicios, clientes y programas de fidelización.",
    icon: Scissors,
    accent: "bg-ink-900",
    modules: ["agenda", "crm", "campaigns", "whatsapp"],
  },
  {
    id: "gimnasios",
    name: "Gimnasios",
    description: "Controla miembros, rutinas, reservas y planes personalizados.",
    icon: Dumbbell,
    accent: "bg-ink-900",
    modules: ["crm", "memberships", "agenda", "whatsapp"],
  },
  {
    id: "clinicas-medicas",
    name: "Clínicas Médicas",
    description: "Gestiona pacientes, citas, especialidades e historiales médicos.",
    icon: Cross,
    accent: "bg-ink-900",
    modules: ["crm", "agenda", "medical-history", "ia-receptionist", "whatsapp"],
  },
  {
    id: "veterinarias",
    name: "Veterinarias",
    description: "Controla pacientes, citas, vacunas y recordatorios automáticos.",
    icon: PawPrint,
    accent: "bg-ink-900",
    modules: ["crm", "agenda", "medical-history", "campaigns"],
  },
  {
    id: "centros-unas",
    name: "Centros de Uñas",
    description: "Gestiona citas, servicios, diseños, clientes y promociones.",
    icon: Sparkles,
    accent: "bg-ink-900",
    modules: ["agenda", "crm", "campaigns", "whatsapp"],
  },
  {
    id: "tiendas-retail",
    name: "Tiendas y Retail",
    description: "Gestiona clientes, ventas, inventario y programas de fidelización.",
    icon: ShoppingBag,
    accent: "bg-ink-900",
    modules: ["crm", "inventory", "campaigns", "whatsapp"],
  },
];

export function getSector(id: string | null | undefined) {
  return SECTORS.find((s) => s.id === id);
}
