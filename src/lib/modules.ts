import {
  Calendar,
  Users,
  MessageCircle,
  Bot,
  Megaphone,
  BarChart3,
  Building2,
  Stethoscope,
  Boxes,
  CreditCard,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  priceMonthly: number; // EUR
  category: "core" | "ai" | "integrations" | "addon";
  required?: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    id: "crm",
    name: "CRM Visual",
    description: "Pipeline Kanban, ficha de cliente, conversaciones y notas.",
    icon: Users,
    priceMonthly: 29,
    category: "core",
    required: true,
  },
  {
    id: "agenda",
    name: "Agenda Inteligente",
    description: "Reservas, bloqueos, recordatorios y sincronización con Google Calendar.",
    icon: Calendar,
    priceMonthly: 19,
    category: "core",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Centraliza mensajes, plantillas y campañas vía WhatsApp API.",
    icon: MessageCircle,
    priceMonthly: 25,
    category: "integrations",
  },
  {
    id: "ia-receptionist",
    name: "IA Recepcionista",
    description: "Atiende clientes 24/7, califica leads y reserva citas en automático.",
    icon: Bot,
    priceMonthly: 49,
    category: "ai",
  },
  {
    id: "campaigns",
    name: "Campañas Inteligentes",
    description: "Segmentación automática y campañas de recuperación con previsión de ROI.",
    icon: Megaphone,
    priceMonthly: 29,
    category: "ai",
  },
  {
    id: "pipeline",
    name: "Pipeline Avanzado",
    description: "Estados personalizados, automatizaciones y previsión de ingresos.",
    icon: Workflow,
    priceMonthly: 19,
    category: "addon",
  },
  {
    id: "medical-history",
    name: "Historial Clínico",
    description: "Fichas médicas, consentimientos y trazabilidad de tratamientos.",
    icon: Stethoscope,
    priceMonthly: 19,
    category: "addon",
  },
  {
    id: "inventory",
    name: "Inventario",
    description: "Stock por sede, movimientos y alertas de reposición.",
    icon: Boxes,
    priceMonthly: 15,
    category: "addon",
  },
  {
    id: "memberships",
    name: "Membresías",
    description: "Planes mensuales, renovaciones automáticas y control de accesos.",
    icon: ShieldCheck,
    priceMonthly: 19,
    category: "addon",
  },
  {
    id: "metrics",
    name: "Métricas Avanzadas",
    description: "Dashboards de conversión, LTV, cohortes y rendimiento por sede.",
    icon: BarChart3,
    priceMonthly: 15,
    category: "addon",
  },
  {
    id: "multi-sede",
    name: "Multi-sede / Franquicias",
    description: "Gestión centralizada de varias clínicas o sedes con permisos por rol.",
    icon: Building2,
    priceMonthly: 39,
    category: "addon",
  },
  {
    id: "billing",
    name: "Facturación",
    description: "Presupuestos, facturas, pagos online y libro contable básico.",
    icon: CreditCard,
    priceMonthly: 19,
    category: "addon",
  },
];

export function getModule(id: string) {
  return MODULES.find((m) => m.id === id);
}
