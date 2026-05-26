import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cloud,
  Globe,
  LineChart,
  Megaphone,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { AizorixLogo } from "@/components/brand/aizorix-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fade } from "@/components/motion/fade";
import { CountUp } from "@/components/motion/count-up";
import { AiChatBubble } from "@/components/landing/ai-chat-bubble";

/**
 * Hero building image. Defaults to a high-quality Unsplash glass tower at
 * blue hour (free to use, whitelisted in next.config). To use the EXACT
 * reference render instead, drop the file at `public/hero-building.jpg`
 * and change this constant to "/hero-building.jpg" — that's the only edit
 * needed for pixel-fidelity.
 */
const HERO_BUILDING_SRC =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80";

const features = [
  {
    icon: Bot,
    title: "IA Recepcionista 24/7",
    text: "Atiende clientes como una secretaria real: capta datos, explica tratamientos y cierra citas en automático.",
    tone: "coral",
  },
  {
    icon: Users,
    title: "CRM con pipeline visual",
    text: "Kanban, ficha completa, historial, notas, conversaciones y métricas en un solo panel.",
    tone: "lavender",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp · Instagram · Facebook",
    text: "Centraliza todos los canales con plantillas, automatizaciones y respuestas asistidas por IA.",
    tone: "mint",
  },
  {
    icon: Calendar,
    title: "Agenda inteligente",
    text: "Sincroniza Google Calendar, evita huecos imposibles y envía recordatorios automáticos.",
    tone: "sky",
  },
  {
    icon: Megaphone,
    title: "Campañas con ROI previsto",
    text: "Segmenta clientes inactivos, VIP o por interés y mira coste e ingresos antes de enviar.",
    tone: "rose",
  },
  {
    icon: LineChart,
    title: "Métricas en tiempo real",
    text: "Conversión, ingresos estimados, rendimiento por empleado y por sede en vivo.",
    tone: "brand",
  },
] as const;

const TONE_STYLES: Record<string, { card: string; icon: string; ring: string }> = {
  // Palette refreshed to the violet/blue brand family — no more teal/green.
  coral: {
    card: "from-[#f5f3ff] to-white",
    icon: "from-[#a78bfa] to-[#6d28d9] text-white",
    ring: "ring-[color:var(--color-brand-100)]",
  },
  lavender: {
    card: "from-[#f5f3ff] to-white",
    icon: "from-[#c4b5fd] to-[#7c3aed] text-white",
    ring: "ring-[color:var(--color-brand-100)]",
  },
  mint: {
    card: "from-[#eef2ff] to-white",
    icon: "from-[#818cf8] to-[#4338ca] text-white",
    ring: "ring-indigo-100",
  },
  sky: {
    card: "from-[#eff7ff] to-white",
    icon: "from-[#60a5fa] to-[#2563eb] text-white",
    ring: "ring-[color:var(--color-sky-100)]",
  },
  rose: {
    card: "from-[#f5f0ff] to-white",
    icon: "from-[#a78bfa] to-[#7c3aed] text-white",
    ring: "ring-[color:var(--color-brand-100)]",
  },
  brand: {
    card: "from-[#f5f3ff] to-white",
    icon: "from-[#8b5cf6] to-[#6d28d9] text-white",
    ring: "ring-[color:var(--color-brand-100)]",
  },
};

const sectors = [
  { name: "Clínicas Estéticas", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&auto=format&fit=crop&q=80" },
  { name: "Medicina Estética", img: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=700&auto=format&fit=crop&q=80" },
  { name: "Dentistas", img: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=700&auto=format&fit=crop&q=80" },
  { name: "Inmobiliarias", img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=700&auto=format&fit=crop&q=80" },
  { name: "Restaurantes", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&auto=format&fit=crop&q=80" },
  { name: "Talleres", img: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=700&auto=format&fit=crop&q=80" },
  { name: "Peluquerías", img: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=700&auto=format&fit=crop&q=80" },
  { name: "Gimnasios", img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&auto=format&fit=crop&q=80" },
  { name: "Clínicas Médicas", img: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=700&auto=format&fit=crop&q=80" },
  { name: "Veterinarias", img: "https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=700&auto=format&fit=crop&q=80" },
  { name: "Centros de Uñas", img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=700&auto=format&fit=crop&q=80" },
  { name: "Retail", img: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=700&auto=format&fit=crop&q=80" },
];

const testimonials = [
  {
    quote:
      "Antes perdíamos clientes los fines de semana. Ahora la IA responde a las 23h y cierra valoraciones mientras dormimos.",
    name: "Cristina Vega",
    role: "Directora · Vanity Center",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80",
  },
  {
    quote:
      "La previsión de ROI antes de enviar la campaña nos salvó de gastar 800 € en un mensaje que no convertía.",
    name: "Marcos Llamas",
    role: "CMO · Levante Inmobiliaria",
    avatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=240&auto=format&fit=crop&q=80",
  },
  {
    quote:
      "Tenemos cuatro sedes y todo el equipo trabaja desde el mismo panel. No volvemos atrás.",
    name: "Lucía Esteban",
    role: "Founder · Clinic Smile",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&auto=format&fit=crop&q=80",
  },
];

const logos = [
  "Vanity Center",
  "Levante Inmobiliaria",
  "Clinic Smile",
  "Aurora Estética",
  "BlueWave",
  "Norte Dental",
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* ─────────────── Top bar ─────────────── */}
      <header className="sticky top-0 z-50 border-b border-[color:var(--color-ink-100)]/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <AizorixLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-[color:var(--color-ink-600)] md:flex">
            <a
              href="#features"
              className="transition hover:text-[color:var(--color-ink-900)]"
            >
              Producto
            </a>
            <a
              href="#sectors"
              className="transition hover:text-[color:var(--color-ink-900)]"
            >
              Sectores
            </a>
            <a
              href="#campaign"
              className="transition hover:text-[color:var(--color-ink-900)]"
            >
              Campañas IA
            </a>
            <a
              href="#testimonials"
              className="transition hover:text-[color:var(--color-ink-900)]"
            >
              Clientes
            </a>
            <Link
              href="/app"
              className="transition hover:text-[color:var(--color-ink-900)]"
            >
              Demo CRM
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/app">Entrar</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/onboarding">
                Empezar <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────────── Hero ─────────────── */}
      <section className="relative overflow-hidden aurora-bg">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-28 md:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <Fade>
              <Link
                href="/app/campaigns"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--color-brand-200)]/60 bg-white/85 px-4 py-1.5 text-xs font-semibold text-[color:var(--color-ink-700)] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[color:var(--color-brand-400)] hover:bg-white hover:shadow-[var(--glow-violet-soft)]"
              >
                <span className="relative inline-flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-brand-400)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-brand-600)]" />
                </span>
                Novedad · ROI previsto antes de enviar
                <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>

              <h1 className="mt-7 text-[2.7rem] font-black leading-[1.04] tracking-[-0.02em] text-[color:var(--color-ink-900)] sm:text-6xl lg:text-[4.25rem]">
                Una plataforma
                <br />
                para cada negocio.{" "}
                <span className="relative inline-block">
                  <span className="text-brand-gradient">Resultados</span>
                  <svg
                    aria-hidden
                    viewBox="0 0 320 12"
                    className="absolute -bottom-2 left-0 h-2 w-full text-[#7c3aed]"
                    fill="none"
                  >
                    <path
                      d="M2 9c80-6 160-6 316 0"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                para todos.
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-relaxed text-[color:var(--color-ink-500)]">
                Conecta, automatiza y escala tu negocio con módulos
                inteligentes diseñados para crecer contigo. CRM, IA
                recepcionista, agenda y campañas en una sola plataforma.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/onboarding">
                    <Sparkles className="h-5 w-5" />
                    Explorar sectores <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/app">
                    <PlayCircle /> Ver cómo funciona
                  </Link>
                </Button>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-[color:var(--color-ink-500)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--color-brand-600)]" />
                  Sin tarjeta para empezar
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--color-brand-600)]" />
                  Onboarding en 10 minutos
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--color-brand-600)]" />
                  Soporte en español
                </span>
              </div>

              {/* Social proof */}
              <div className="mt-12 flex items-center gap-5">
                <div className="flex -space-x-2.5">
                  {testimonials.map((t) => (
                    <span
                      key={t.name}
                      className="relative inline-block h-9 w-9 overflow-hidden rounded-full ring-2 ring-white"
                    >
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </span>
                  ))}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-[10px] font-black text-white ring-2 ring-white shadow-[0_4px_10px_-4px_rgba(124,58,237,0.5)]">
                    +120
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-0.5 text-[#f59e0b]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-[color:var(--color-ink-500)]">
                    4.9 sobre 5 · +250 negocios automatizados con Aizorix
                  </p>
                </div>
              </div>
            </Fade>

            {/* Hero showcase — futuristic violet banner with floating KPI cards */}
            <Fade delay={2} className="relative">
              {/* Background aurora glow */}
              <div className="absolute -inset-12 -z-10 rounded-[44px] bg-gradient-to-br from-[#c4b5fd]/60 via-[#a78bfa]/30 to-[#7c3aed]/40 blur-3xl opacity-80" />

              {/* Main banner — real glass-building photo with a violet
                  atmosphere overlay, matching the reference image.

                  IMAGE SOURCE: drop your exact reference render at
                  public/hero-building.jpg for pixel-fidelity — the <source>
                  below prefers it. Until then we fall back to a high-quality
                  Unsplash glass tower at blue hour (free to use). */}
              <div className="relative overflow-hidden rounded-[28px] border border-white/40 shadow-[0_30px_80px_-24px_rgba(76,29,149,0.55)] aspect-[5/4]">
                <Image
                  src={HERO_BUILDING_SRC}
                  alt="Edificio corporativo de cristal al atardecer — Aizorix AI"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 45vw"
                  className="object-cover"
                />

                {/* Violet/indigo atmosphere overlay — unifies the photo with
                    the brand and recreates the reference's dusk mood. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/72 via-[#4338ca]/45 to-[#7c3aed]/55 mix-blend-multiply"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1e1b4b]/70 via-transparent to-[#a78bfa]/15"
                />
                {/* Light streak sweeping across, like the reference. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-1/3 h-px w-2/3 rotate-[-10deg] bg-gradient-to-r from-transparent via-white/50 to-transparent"
                />
                {/* Glow accents */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#a78bfa]/30 blur-3xl"
                />

                {/* AIZORIX wordmark on the building, as in the reference. */}
                <div className="absolute inset-x-0 top-7 flex justify-center">
                  <span className="text-2xl font-black tracking-[0.14em] text-white/90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)] sm:text-3xl">
                    AIZORIX
                  </span>
                </div>
                {/* Status chip bottom-left */}
                <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Operativo · 99,97% uptime
                </div>
              </div>

              {/* Floating KPI card — top-right (Automatizaciones activas) */}
              <div
                className="absolute -right-3 top-6 w-52 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(15,21,44,0.18)] backdrop-blur-xl anim-float"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-50 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 60%)",
                  }}
                />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                    Automatizaciones activas
                  </p>
                  <p className="mt-1 flex items-baseline gap-1.5 text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                    <CountUp to={128} duration={1400} />
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                      <TrendingUp className="h-2.5 w-2.5" />
                      +24%
                    </span>
                  </p>
                  {/* Mini chart hint */}
                  <svg
                    aria-hidden
                    viewBox="0 0 120 30"
                    className="mt-2 h-7 w-full text-[#7c3aed]"
                    fill="none"
                  >
                    <path
                      d="M2 22 L18 16 L34 19 L48 12 L62 14 L78 8 L94 11 L118 4"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 22 L18 16 L34 19 L48 12 L62 14 L78 8 L94 11 L118 4 L118 30 L2 30 Z"
                      fill="url(#sparkFill)"
                      opacity="0.25"
                    />
                    <defs>
                      <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Floating KPI card — middle-right (Ahorro de tiempo) */}
              <div
                className="absolute -right-2 top-[58%] w-48 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(15,21,44,0.18)] backdrop-blur-xl"
                style={{ animation: "float-y 7s ease-in-out infinite reverse" }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] text-[#6d28d9] ring-1 ring-[#c4b5fd]/60">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                      Ahorro de tiempo
                    </p>
                    <p className="mt-0.5 text-2xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                      <CountUp to={320} duration={1600} suffix=" h" />
                    </p>
                    <p className="text-[10px] text-[color:var(--color-ink-500)]">
                      este mes
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating KPI card — bottom-left (Mensajes IA) */}
              <div
                className="absolute -left-4 -bottom-4 hidden w-56 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(15,21,44,0.18)] backdrop-blur-xl md:block"
                style={{ animation: "float-y 8s ease-in-out infinite" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-[0_6px_14px_-6px_rgba(124,58,237,0.55)]">
                    <Bot className="h-4 w-4" />
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[color:var(--color-ink-900)]">
                      IA Recepcionista
                    </p>
                    <p className="truncate text-[10px] text-emerald-600">
                      Respondiendo · 1.2 s
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-[color:var(--color-ink-500)]">Mensajes hoy</span>
                  <span className="font-black text-[color:var(--color-ink-900)]">
                    <CountUp to={1247} duration={1400} />
                  </span>
                </div>
              </div>
            </Fade>
          </div>

          {/* Logo strip */}
          <div className="mt-24 border-t border-[color:var(--color-ink-100)]/70 pt-10">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-ink-400)]">
              Negocios que ya confían en Aizorix
            </p>
            <div className="mt-6 overflow-hidden">
              <div className="flex items-center gap-12 whitespace-nowrap text-lg font-black tracking-tight text-[color:var(--color-ink-300)] sm:justify-center sm:gap-16">
                {logos.map((l) => (
                  <span
                    key={l}
                    className="opacity-80 transition hover:opacity-100 hover:text-[color:var(--color-ink-600)]"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Dark feature strip (matches the reference's glowing band) ─────────────── */}
      <section className="relative overflow-hidden border-y border-white/10 bg-gradient-to-br from-[#1a1530] via-[#1e1b4b] to-[#1a1530] py-10">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c3aed]/15 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a78bfa]/40 to-transparent"
        />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              icon: Zap,
              title: "Automatiza procesos",
              text: "Ahorra tiempo y reduce costes operativos.",
            },
            {
              icon: Bot,
              title: "Inteligencia Artificial",
              text: "IA avanzada que trabaja para tu negocio.",
            },
            {
              icon: LineChart,
              title: "Datos en tiempo real",
              text: "Toma decisiones con información actualizada.",
            },
            {
              icon: Sparkles,
              title: "100% Personalizable",
              text: "Adaptamos la plataforma a tu forma de trabajar.",
            },
            {
              icon: ShieldCheck,
              title: "Seguro y confiable",
              text: "Tus datos y los de tus clientes siempre protegidos.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group flex items-start gap-3 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed]/25 to-[#5b21b6]/40 text-[#c4b5fd] ring-1 ring-white/10 backdrop-blur transition group-hover:from-[#8b5cf6]/35 group-hover:to-[#6d28d9]/60 group-hover:text-white">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/65">
                  {f.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── Stat strip ─────────────── */}
      <section className="border-y border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "+18.000", v: "Citas creadas por la IA" },
            { k: "23,7%", v: "Tasa media de cierre" },
            { k: "1,2 s", v: "Tiempo de respuesta WhatsApp" },
            { k: "12+", v: "Sectores soportados" },
          ].map((s) => (
            <div key={s.v} className="text-center sm:text-left">
              <p className="text-3xl font-black tracking-tight md:text-4xl text-brand-gradient">
                {s.k}
              </p>
              <p className="mt-1 text-sm font-medium text-[color:var(--color-ink-500)]">
                {s.v}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── Features ─────────────── */}
      <section
        id="features"
        className="relative border-b border-[color:var(--color-ink-100)] bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="brand" className="mb-4">
              <Zap className="h-3 w-3" /> Todo en uno
            </Badge>
            <h2 className="text-4xl font-black tracking-[-0.02em] md:text-5xl">
              Una plataforma. Todos los módulos que tu negocio necesita.
            </h2>
            <p className="mt-5 text-lg text-[color:var(--color-ink-500)]">
              Contrata solo lo que necesitas y añade módulos cuando crezcas. El
              núcleo es el mismo, las funcionalidades se activan a tu medida.
            </p>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const t = TONE_STYLES[f.tone];
              return (
                <div
                  key={f.title}
                  className={`group relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br ${t.card} p-7 shadow-[var(--shadow-sm)] ring-1 ${t.ring} card-hover`}
                >
                  <div className="relative">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${t.icon} shadow-[0_10px_24px_-10px_rgba(28,36,64,0.25)] transition group-hover:scale-105`}
                    >
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold tracking-tight text-[color:var(--color-ink-900)]">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-600)]">
                      {f.text}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-ink-800)] opacity-0 transition group-hover:opacity-100">
                      Ver módulo <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── CRM showcase ─────────────── */}
      <section className="relative overflow-hidden border-b border-[color:var(--color-ink-100)] aurora-soft py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="outline" className="mb-4">
              CRM en vivo
            </Badge>
            <h2 className="text-4xl font-black tracking-[-0.02em] md:text-[2.75rem]">
              Tu equipo y la IA, trabajando en{" "}
              <span className="text-brand-gradient">el mismo panel</span>.
            </h2>
            <p className="mt-5 text-lg text-[color:var(--color-ink-500)]">
              Pipeline Kanban, agenda inteligente, conversaciones multi-canal y
              métricas en tiempo real. Cada lead es un cliente cualificado.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-[color:var(--color-ink-700)]">
              {[
                "Conversaciones multi-canal en una bandeja",
                "Pipeline arrastrable de 5 estados",
                "Sincronización Google Calendar bidireccional",
                "Permisos por rol (recepción, técnico, admin)",
              ].map((l) => (
                <li key={l} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white shadow-[0_4px_10px_-4px_rgba(124,58,237,0.5)]">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  {l}
                </li>
              ))}
            </ul>
            <Button asChild variant="accent" size="lg" className="mt-9">
              <Link href="/app">
                Explorar el CRM <ArrowRight />
              </Link>
            </Button>
          </div>

          {/* CRM mock */}
          <div className="relative">
            <div className="absolute -inset-10 -z-10 rounded-[48px] bg-gradient-to-br from-[color:var(--color-brand-100)] via-[color:var(--color-sky-100)] to-[color:var(--color-lavender-100)] blur-3xl opacity-80" />
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[var(--shadow-xl)] ring-1 ring-[color:var(--color-ink-100)]">
              <div className="flex items-center gap-2 border-b border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#f87171]" />
                <span className="h-3 w-3 rounded-full bg-[#fbbf24]" />
                <span className="h-3 w-3 rounded-full bg-[#34d399]" />
                <span className="ml-3 truncate text-xs font-medium text-[color:var(--color-ink-500)]">
                  app.aizorix.ai/dashboard
                </span>
              </div>
              <div className="grid grid-cols-12 gap-0">
                {/* sidebar */}
                <div className="col-span-3 border-r border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-3">
                  <div className="mb-3 flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                    Workspace
                  </div>
                  {[
                    { l: "Dashboard", on: true },
                    { l: "Pipeline", on: false },
                    { l: "Clientes", on: false },
                    { l: "Conversaciones", on: false },
                    { l: "Agenda", on: false },
                    { l: "IA Recepcionista", on: false },
                  ].map((i) => (
                    <div
                      key={i.l}
                      className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                        i.on
                          ? "bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white"
                          : "text-[color:var(--color-ink-600)]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          i.on
                            ? "bg-white"
                            : "bg-[color:var(--color-ink-300)]"
                        }`}
                      />
                      {i.l}
                    </div>
                  ))}
                </div>

                {/* main */}
                <div className="col-span-9 p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: "Leads 7d", v: "38", d: "+22%", c: "from-[#f5f3ff] to-white" },
                      { l: "Citas", v: "14", d: "3 hoy", c: "from-[#eff7ff] to-white" },
                      { l: "Cierre", v: "23,7%", d: "+4%", c: "from-[#f5f3ff] to-white" },
                      { l: "Ingresos", v: "8,4k €", d: "+12%", c: "from-[#eef2ff] to-white" },
                    ].map((s) => (
                      <div
                        key={s.l}
                        className={`rounded-lg border border-[color:var(--color-ink-100)] bg-gradient-to-br ${s.c} p-2.5`}
                      >
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                          {s.l}
                        </p>
                        <p className="mt-0.5 text-base font-black">{s.v}</p>
                        <p className="text-[9px] font-semibold text-emerald-600">
                          {s.d}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-lg border border-[color:var(--color-ink-100)] bg-white p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                      Embudo de conversión
                    </p>
                    {[
                      { l: "Leads", w: 100, g: "from-[#60a5fa] to-[#2563eb]" },
                      { l: "Conversaciones IA", w: 73, g: "from-[#a78bfa] to-[#7c3aed]" },
                      { l: "Interesados", w: 47, g: "from-[#8b5cf6] to-[#6d28d9]" },
                      { l: "Citas agendadas", w: 31, g: "from-[#818cf8] to-[#4338ca]" },
                      { l: "Ventas cerradas", w: 24, g: "from-[#22d3ee] to-[#0891b2]" },
                    ].map((b) => (
                      <div key={b.l} className="mt-2 flex items-center gap-2">
                        <span className="w-28 text-[10px] text-[color:var(--color-ink-600)]">
                          {b.l}
                        </span>
                        <div className="h-1.5 flex-1 rounded-full bg-[color:var(--color-ink-100)]">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${b.g}`}
                            style={{ width: `${b.w}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-[10px] font-bold">
                          {b.w}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Sectors ─────────────── */}
      <section
        id="sectors"
        className="border-b border-[color:var(--color-ink-100)] bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="brand" className="mb-4">
              <Globe className="h-3 w-3" /> Multi-sector
            </Badge>
            <h2 className="text-4xl font-black tracking-[-0.02em] md:text-5xl">
              Diseñado para 12+ sectores.
            </h2>
            <p className="mt-5 text-lg text-[color:var(--color-ink-500)]">
              Cada negocio recibe un onboarding y un set de módulos a medida. La
              base es la misma; el flujo cambia según tu sector.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sectors.map((s, i) => (
              <div
                key={s.name}
                className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-sm)] ring-1 ring-[color:var(--color-ink-100)] anim-fade-up card-hover"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Image
                  src={s.img}
                  alt={s.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-base font-bold text-[color:var(--color-ink-900)]">
                    {s.name}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)] shadow-sm">
                    Onboarding listo
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Campaign ROI (bright) ─────────────── */}
      <section
        id="campaign"
        className="relative overflow-hidden border-b border-[color:var(--color-ink-100)] aurora-coral py-24"
      >
        <div className="pointer-events-none absolute inset-0 dotted-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="brand" className="mb-4">
              <Sparkles className="h-3 w-3" /> Exclusivo Aizorix
            </Badge>
            <h2 className="text-4xl font-black tracking-[-0.02em] text-[color:var(--color-ink-900)] md:text-5xl">
              Mira el ROI{" "}
              <span className="text-brand-gradient">antes</span> de enviar la
              campaña.
            </h2>
            <p className="mt-5 text-lg text-[color:var(--color-ink-600)]">
              Nuestro motor calcula coste de envío, conversión esperada e
              ingresos potenciales en tiempo real, antes de gastar un solo
              céntimo.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/app/campaigns">
                  Probar simulador <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/onboarding">Crear cuenta</Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { k: "1.250", v: "Clientes" },
                { k: "22,50 €", v: "Coste WhatsApp" },
                { k: "3 – 8 K €", v: "Ingresos prev." },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur"
                >
                  <p className="text-2xl font-black tracking-tight text-brand-gradient">
                    {s.k}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--color-ink-500)]">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* preview card */}
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[44px] bg-gradient-to-br from-[color:var(--color-sky-200)] to-[color:var(--color-brand-200)] blur-3xl opacity-70" />
            <div className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[var(--shadow-xl)] backdrop-blur-xl ring-1 ring-[color:var(--color-ink-100)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[color:var(--color-ink-500)]">
                    Vista previa
                  </p>
                  <p className="mt-1 text-lg font-bold text-[color:var(--color-ink-900)]">
                    Recuperación inactivos · 6m
                  </p>
                </div>
                <Badge variant="outline">Borrador</Badge>
              </div>

              <dl className="mt-7 space-y-4 text-sm">
                {[
                  { l: "Clientes seleccionados", v: "1.250" },
                  { l: "Coste WhatsApp / mensaje", v: "0,018 €" },
                  { l: "Coste total estimado", v: "22,50 €", accent: true },
                  { l: "Conversión IA estimada", v: "12% – 18%" },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="flex justify-between border-b border-[color:var(--color-ink-100)] pb-3"
                  >
                    <dt className="text-[color:var(--color-ink-500)]">{r.l}</dt>
                    <dd
                      className={
                        r.accent
                          ? "font-bold text-[color:var(--color-brand-600)]"
                          : "font-semibold text-[color:var(--color-ink-900)]"
                      }
                    >
                      {r.v}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-100)] via-[color:var(--color-sky-100)] to-white p-5 ring-1 ring-[color:var(--color-brand-200)]/60">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-brand-700)]">
                  Ingresos potenciales
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                  3.000 € – 8.000 €
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-ink-600)]">
                  Cálculo basado en ticket medio y conversión histórica.
                </p>
              </div>
            </div>

            <div className="absolute -top-5 right-6 rounded-full border border-white/80 bg-white/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-700)] shadow-md anim-float">
              ROI calculado en vivo
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Testimonials ─────────────── */}
      <section
        id="testimonials"
        className="border-b border-[color:var(--color-ink-100)] bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="brand" className="mb-4">
              <Star className="h-3 w-3 fill-current" /> Historias reales
            </Badge>
            <h2 className="text-4xl font-black tracking-[-0.02em] md:text-5xl">
              Equipos que ya no vuelven atrás.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => {
              const tones = ["coral", "lavender", "mint"] as const;
              const ts = TONE_STYLES[tones[i % tones.length]];
              return (
                <figure
                  key={t.name}
                  className={`relative flex flex-col overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-b ${ts.card} p-7 shadow-[var(--shadow-sm)] ring-1 ${ts.ring} card-hover anim-fade-up`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-0.5 text-[color:var(--color-brand-500)]">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-base font-medium leading-relaxed text-[color:var(--color-ink-800)]">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-white/70 pt-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-white">
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[color:var(--color-ink-900)]">
                        {t.name}
                      </p>
                      <p className="text-xs text-[color:var(--color-ink-500)]">
                        {t.role}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── Final CTA (bright) ─────────────── */}
      <section className="relative overflow-hidden border-b border-[color:var(--color-ink-100)] aurora-lavender py-24">
        <div className="pointer-events-none absolute inset-0 dotted-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <Badge variant="brand" className="mb-5">
            <TrendingUp className="h-3 w-3" /> Lanzamiento 2026
          </Badge>
          <h2 className="text-4xl font-black tracking-[-0.02em] text-[color:var(--color-ink-900)] md:text-5xl">
            Activa tu CRM con IA en menos de{" "}
            <span className="text-brand-gradient">10 minutos</span>.
          </h2>
          <p className="mt-5 text-lg text-[color:var(--color-ink-600)]">
            Sin instalaciones, sin contratos largos. Empieza con un módulo y
            añade el resto cuando estés listo.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/onboarding">
                Empezar onboarding <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/app">Probar demo</Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[color:var(--color-ink-500)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> RGPD
            </span>
            <span className="flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5" /> 100% nube
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Soporte humano en español
            </span>
          </div>
        </div>
      </section>

      {/* ─────────────── Footer ─────────────── */}
      <footer className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <AizorixLogo />
              <p className="max-w-xs text-sm text-[color:var(--color-ink-500)]">
                CRM modular con IA para clínicas, comercios y servicios.
                Diseñado en España para el mundo.
              </p>
            </div>
            <FooterCol
              title="Producto"
              links={[
                ["Funcionalidades", "#features"],
                ["Sectores", "#sectors"],
                ["Campañas IA", "#campaign"],
                ["Demo CRM", "/app"],
              ]}
            />
            <FooterCol
              title="Empresa"
              links={[
                ["Onboarding", "/onboarding"],
                ["Clientes", "#testimonials"],
                ["Contacto", "mailto:hola@aizorix.ai"],
              ]}
            />
            <FooterCol
              title="Recursos"
              links={[
                ["Documentación", "#"],
                ["Estado del servicio", "#"],
                ["Privacidad", "#"],
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--color-ink-100)] pt-6 text-xs text-[color:var(--color-ink-500)] sm:flex-row">
            <span>
              © {new Date().getFullYear()} Aizorix AI · Todos los derechos
              reservados
            </span>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> RGPD
              </span>
              <span className="flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" /> 100% nube
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Hecho con cariño
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating AI chat bubble — fixed bottom-right, teaser conversation */}
      <AiChatBubble />
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-ink-900)]">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-[color:var(--color-ink-500)]">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="transition hover:text-[color:var(--color-ink-900)]"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
