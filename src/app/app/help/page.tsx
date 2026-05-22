import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Calendar,
  CircleHelp,
  FileText,
  Inbox,
  KeyRound,
  LifeBuoy,
  ListChecks,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Ayuda · Aizorix",
};

export default async function HelpPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-brand-200)]/60 bg-gradient-to-br from-[color:var(--color-brand-50)] to-white p-7 shadow-[var(--shadow-sm)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,128,105,0.55) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
            <Sparkles className="h-3.5 w-3.5" /> Centro de ayuda
          </div>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)] md:text-3xl">
            Bienvenido a Aizorix
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-ink-600)] md:text-base">
            Tu recepcionista virtual con IA para WhatsApp. Esta página resume
            las pantallas, las tareas más comunes y dónde encontrar las
            respuestas si algo no encaja.
          </p>
        </div>
      </div>

      <nav aria-label="Tabla de contenidos">
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
              <ListChecks className="h-3.5 w-3.5" /> En esta página
            </p>
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              {SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[color:var(--color-ink-700)] transition hover:bg-[color:var(--color-ink-50)] hover:text-[color:var(--color-ink-900)]"
                >
                  <s.icon className="h-4 w-4 text-[color:var(--color-brand-600)]" />
                  {s.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </nav>

      <section id="esencial" className="scroll-mt-24">
        <SectionHeader
          icon={Sparkles}
          eyebrow="Empezar"
          title="Lo esencial en 60 segundos"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Tile
            icon={MessageSquare}
            title="Recibes mensajes 24/7"
            body="Cuando un paciente escribe al WhatsApp de la clínica, la IA responde con tu tono, busca huecos y confirma reservas."
          />
          <Tile
            icon={Bot}
            title="El bot escala cuando hace falta"
            body="Si detecta una queja, un caso médico o que el paciente lo pide, marca la conversación como 'Necesitan ayuda' y pausa el bot."
          />
          <Tile
            icon={Calendar}
            title="La agenda se sincroniza al instante"
            body="Cualquier cita reservada por el bot aparece en /app/agenda. También puedes crear citas manualmente desde la ficha del paciente."
          />
          <Tile
            icon={ShieldCheck}
            title="Todo queda registrado"
            body="Auditoría detallada de cada cambio de configuración, mensaje manual y escalada. Exportable a CSV en /app/settings/audit."
          />
        </div>
      </section>

      <section id="pantallas" className="scroll-mt-24">
        <SectionHeader
          icon={Inbox}
          eyebrow="Panel"
          title="Qué hay en cada pantalla"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {SCREENS.map((s) => (
            <Card key={s.href}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-sm font-bold text-[color:var(--color-ink-900)]">
                        {s.title}
                      </h3>
                      <Link
                        href={s.href}
                        className="text-[11px] font-medium text-[color:var(--color-brand-700)] hover:underline"
                      >
                        {s.href}
                      </Link>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">
                      {s.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="tareas" className="scroll-mt-24">
        <SectionHeader
          icon={ListChecks}
          eyebrow="Recetas"
          title="Tareas comunes paso a paso"
        />
        <div className="space-y-3">
          {RECIPES.map((r) => (
            <Card key={r.title}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <r.icon className="h-4 w-4 text-[color:var(--color-brand-700)]" />
                  <h3 className="text-sm font-bold text-[color:var(--color-ink-900)]">
                    {r.title}
                  </h3>
                  {r.role && (
                    <Badge variant="outline" className="lowercase">
                      {r.role}
                    </Badge>
                  )}
                </div>
                <ol className="mt-3 space-y-1.5 pl-1 text-sm text-[color:var(--color-ink-700)]">
                  {r.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-ink-100)] text-[10px] font-bold text-[color:var(--color-ink-700)]">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="roles" className="scroll-mt-24">
        <SectionHeader
          icon={Users}
          eyebrow="Permisos"
          title="Roles del equipo"
        />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-[color:var(--color-ink-100)]">
              {ROLES.map((r) => (
                <div
                  key={r.role}
                  className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-4"
                >
                  <div className="md:w-44">
                    <Badge variant="brand">{r.role}</Badge>
                    <p className="mt-1 text-[11px] text-[color:var(--color-ink-500)]">
                      {r.label}
                    </p>
                  </div>
                  <p className="text-sm text-[color:var(--color-ink-700)]">
                    {r.body}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="faq" className="scroll-mt-24">
        <SectionHeader
          icon={CircleHelp}
          eyebrow="FAQ"
          title="Preguntas frecuentes"
        />
        <div className="space-y-2">
          {FAQ.map((q) => (
            <Card key={q.q}>
              <CardContent className="p-0">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 p-4 text-sm font-semibold text-[color:var(--color-ink-900)] hover:bg-[color:var(--color-ink-50)]">
                    {q.q}
                    <span className="text-[color:var(--color-ink-400)] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-t border-[color:var(--color-ink-100)] p-4 pt-3 text-sm text-[color:var(--color-ink-700)]">
                    {q.a}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="problemas" className="scroll-mt-24">
        <SectionHeader
          icon={LifeBuoy}
          eyebrow="Si algo falla"
          title="Solución de problemas"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {TROUBLESHOOTING.map((t) => (
            <Card key={t.title}>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-[color:var(--color-ink-900)]">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">
                  {t.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="mas" className="scroll-mt-24">
        <Card className="bg-gradient-to-br from-[color:var(--color-brand-50)] to-white">
          <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-bold text-[color:var(--color-ink-900)]">
                ¿No encuentras lo que buscas?
              </h3>
              <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">
                El manual completo (`MANUAL.md`, en la raíz del proyecto) cubre
                el flujo interno del bot, el glosario técnico y los límites
                conocidos. También puedes escribir al equipo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="mailto:soporte@aizorix.dev"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--color-ink-900)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--color-ink-800)]"
              >
                <LifeBuoy className="h-4 w-4" /> Contactar soporte
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const SECTIONS = [
  { id: "esencial", label: "Lo esencial", icon: Sparkles },
  { id: "pantallas", label: "Pantallas del panel", icon: Inbox },
  { id: "tareas", label: "Tareas comunes", icon: ListChecks },
  { id: "roles", label: "Roles del equipo", icon: Users },
  { id: "faq", label: "Preguntas frecuentes", icon: CircleHelp },
  { id: "problemas", label: "Solución de problemas", icon: LifeBuoy },
] as const;

const SCREENS = [
  {
    icon: Sparkles,
    title: "Dashboard",
    href: "/app",
    body: "Resumen del día: leads recientes, próximas citas, conversaciones recientes y rendimiento de la IA.",
  },
  {
    icon: Users,
    title: "Clientes",
    href: "/app/clients",
    body: "Lista paginada con buscador. Crea pacientes manualmente o abre fichas con historial de conversaciones y citas.",
  },
  {
    icon: MessageSquare,
    title: "Conversaciones",
    href: "/app/conversations",
    body: "Bandeja unificada. Composer manual, pausar/reactivar bot, marcar como resuelto y detalle técnico de cada tool-call.",
  },
  {
    icon: Calendar,
    title: "Agenda",
    href: "/app/agenda",
    body: "Cuadrícula semanal + próximas citas con cancelar/mover inline. Botón 'Nueva cita manual'.",
  },
  {
    icon: Bot,
    title: "IA Recepcionista",
    href: "/app/ai",
    body: "Demo del bot — modos simulado y real para probar respuestas sin enviar nada al paciente.",
  },
  {
    icon: ShieldCheck,
    title: "Configuración",
    href: "/app/settings",
    body: "Datos de la clínica, horarios, IA, empleados, módulos, facturación y auditoría.",
  },
] as const;

const RECIPES = [
  {
    icon: Phone,
    title: "Reservar una cita por teléfono",
    role: null as string | null,
    steps: [
      "Abre la ficha del paciente en /app/clients/<id>.",
      "Pulsa 'Reservar cita' — abre /app/agenda/new con el paciente ya seleccionado.",
      "Elige tratamiento, técnico, fecha y hora.",
      "Si la cita es inmediata y bloquea por minLeadMinutes, marca la casilla 'saltar mínimo'.",
    ],
  },
  {
    icon: Inbox,
    title: "Atender una conversación escalada",
    role: null,
    steps: [
      "Mira el badge naranja sobre 'Conversaciones' en la barra lateral.",
      "Entra a /app/conversations y filtra 'Necesitan ayuda'.",
      "El bot está pausado automáticamente. Escribe tu respuesta en el composer y envíala.",
      "Cuando hayas resuelto, pulsa 'Marcar resuelto' — el bot vuelve a estar activo.",
    ],
  },
  {
    icon: Bot,
    title: "Cambiar el tono del bot",
    role: "OWNER / ADMIN",
    steps: [
      "Ve a /app/settings/ai.",
      "Elige Formal / Cercano / Neutro y, opcionalmente, añade instrucciones específicas (hasta 2000 caracteres).",
      "Pulsa 'Guardar'. El cambio se aplica al siguiente mensaje, no a hilos en curso.",
    ],
  },
  {
    icon: KeyRound,
    title: "Invitar a un compañero",
    role: "OWNER / ADMIN",
    steps: [
      "/app/settings/staff → 'Invitar empleado'.",
      "Email + nombre + rol → 'Guardar'. Recibirán un enlace de un solo uso por email.",
      "Si el enlace expira, vuelve a la lista y pulsa 'Reenviar enlace' en su fila.",
    ],
  },
  {
    icon: Stethoscope,
    title: "Añadir un dato persistente sobre un paciente",
    role: null,
    steps: [
      "Abre la ficha del paciente → tarjeta 'Memorias del bot'.",
      "Clave en snake_case + valor → 'Añadir'. Ejemplo: allergic_to = lidocaína.",
      "La IA usará estas memorias en cada respuesta, sin citarlas literalmente.",
    ],
  },
  {
    icon: FileText,
    title: "Exportar el registro de auditoría",
    role: "OWNER / ADMIN",
    steps: [
      "Entra a /app/settings/audit.",
      "Opcional: aplica filtros por acción y rango de fechas.",
      "Pulsa 'Exportar CSV' — descarga timestamp, acción, actor, target y metadatos.",
    ],
  },
] as const;

const ROLES = [
  {
    role: "OWNER",
    label: "Propietario/a",
    body: "Acceso total: configuración, empleados (incluido invitar otros OWNERs), módulos, facturación, auditoría.",
  },
  {
    role: "ADMIN",
    label: "Administrador/a",
    body: "Igual que OWNER salvo gestionar el rol OWNER.",
  },
  {
    role: "RECEPTIONIST",
    label: "Recepción",
    body: "Bandeja, agenda, clientes y demo del bot. No accede a configuración ni auditoría.",
  },
  {
    role: "STAFF",
    label: "Personal",
    body: "Mismos accesos que recepción.",
  },
] as const;

const FAQ = [
  {
    q: "¿Puedo desactivar la IA temporalmente sin perder los mensajes?",
    a: "Sí. Abre la conversación y pulsa 'Pausar bot' en el composer. El paciente seguirá escribiendo, los mensajes se guardarán, pero la IA no responderá hasta que reactives o marques la conversación como resuelta.",
  },
  {
    q: "¿Qué pasa si elimino un módulo?",
    a: "Su entrada desaparece de la barra lateral en la siguiente navegación. Si alguien intenta entrar a su URL directamente, el sistema le redirige a configuración con un aviso ámbar. Las URLs y datos no se borran — basta con reactivar el módulo.",
  },
  {
    q: "¿Por qué el bot no me reconoce aunque ya tengo ficha?",
    a: "El bot identifica al paciente por el número de teléfono en formato E.164 (+34...). Si tu ficha tiene un teléfono distinto al que está escribiendo, no podrá enlazarte. Edita la ficha y corrige el número.",
  },
  {
    q: "¿Puedo cambiar el tono solo para un paciente concreto?",
    a: "El tono es global por clínica. Para un paciente específico, usa 'Memorias del bot' para guardar una instrucción (ej.: prefers_formal_address = sí).",
  },
  {
    q: "¿Las citas creadas manualmente cuentan en las métricas de la IA?",
    a: "No. La pantalla de Métricas separa las citas creadas por el bot de las creadas manualmente. Solo las que crea el bot cuentan en 'tasa de cierre' y 'ingresos atribuidos a la IA'.",
  },
] as const;

const TROUBLESHOOTING = [
  {
    title: "No recibo el enlace de acceso por email",
    body: "Revisa la carpeta de spam. Si no aparece, pídele a tu OWNER o ADMIN que entre a /app/settings/staff y pulse 'Reenviar enlace' en tu fila. Los enlaces caducan a las 24h.",
  },
  {
    title: "El bot responde en otro idioma",
    body: "Comprueba en /app/settings/clinic que el idioma esté en es-ES. El bot detecta también el idioma del mensaje del paciente, así que si te escribió en inglés, responderá en inglés esa única conversación.",
  },
  {
    title: "Una cita no aparece en la agenda",
    body: "Refresca la pestaña. Si sigue sin aparecer, abre la conversación del paciente y mira el 'Detalle técnico' del último mensaje del bot — verás si book_appointment falló y por qué.",
  },
  {
    title: "Veo 'Módulo desactivado' al entrar a una pantalla",
    body: "Significa que tu OWNER o ADMIN ha desactivado ese módulo en /app/settings/modulos. Habla con ellos para reactivarlo.",
  },
] as const;

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--color-ink-900)] text-[color:var(--color-brand-400)]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
          {eyebrow}
        </p>
        <h2 className="text-lg font-black tracking-tight text-[color:var(--color-ink-900)]">
          {title}
        </h2>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[color:var(--color-ink-900)]">
              {title}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--color-ink-600)]">
              {body}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

