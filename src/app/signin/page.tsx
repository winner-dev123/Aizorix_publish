import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { Sparkles, Mail, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ email?: string; error?: string; sent?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (session?.user) redirect("/app");

  const { error, sent } = await searchParams;

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return;
    await signIn("nodemailer", { email, redirectTo: "/app" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--color-surface-2)] p-6">
      {/* Aurora background — violet/blue glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 60%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 60%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />

      <div className="relative grid w-full max-w-4xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        {/* Left — value prop card (dark violet) */}
        <aside className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#5b21b6] p-8 text-white shadow-[0_30px_80px_-24px_rgba(76,29,149,0.55)] lg:block">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-[#a78bfa]/40 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-10 h-60 w-60 rounded-full bg-[#7c3aed]/35 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
          <div className="relative flex h-full flex-col">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 ring-1 ring-white/20 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" /> Aizorix Platform
            </span>
            <h2 className="mt-8 text-3xl font-black leading-[1.1] tracking-tight drop-shadow-[0_8px_24px_rgba(124,58,237,0.5)]">
              Automatiza tu negocio
              <br />
              con IA desde un solo panel.
            </h2>
            <p className="mt-3 max-w-sm text-sm text-white/75">
              Recepcionista virtual, CRM, agenda, campañas inteligentes y
              métricas en tiempo real — todo conectado.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Acceso sin contraseña — enlace seguro al correo",
                "Sesión válida en todos tus dispositivos",
                "Cumple con GDPR y políticas de la clínica",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="text-white/80">{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <p className="flex items-center gap-2 text-xs text-white/60">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tus credenciales nunca salen del entorno seguro.
              </p>
            </div>
          </div>
        </aside>

        {/* Right — sign-in card (glass on light bg) */}
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-8 shadow-[0_30px_80px_-24px_rgba(15,21,44,0.18)] backdrop-blur-xl">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-60 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 65%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-[0_8px_22px_-10px_rgba(124,58,237,0.55)]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-[color:var(--color-ink-900)]">
                  Bienvenida de vuelta
                </h1>
                <p className="mt-0.5 text-sm text-[color:var(--color-ink-500)]">
                  Accede con tu correo. Te enviaremos un enlace de un solo uso.
                </p>
              </div>
            </div>

            {sent && (
              <p className="mt-6 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200/70">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                Si tu correo está registrado, recibirás un enlace en breve.
                Revisa también la consola del servidor en desarrollo.
              </p>
            )}
            {error && (
              <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/70">
                No hemos podido enviar el enlace. Comprueba que tu correo esté
                registrado por la clínica.
              </p>
            )}

            <form action={action} className="mt-7 space-y-4">
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]">
                  Correo
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="tu@clinica.com"
                  className="mt-1.5 block h-11 w-full rounded-xl border border-[color:var(--color-ink-200)] bg-white px-4 text-sm font-medium text-[color:var(--color-ink-900)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-shadow focus:border-[color:var(--color-brand-400)] focus:outline-none focus:ring-4 focus:ring-[color:var(--color-brand-200)]/55"
                />
              </label>
              <button
                type="submit"
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] px-5 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(124,58,237,0.7)] active:scale-[0.98]"
              >
                Enviar enlace
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[color:var(--color-ink-500)]">
              ¿Eres dueño/a y aún no tienes cuenta?{" "}
              <Link
                href="/onboarding"
                className="font-bold text-[color:var(--color-brand-700)] underline-offset-4 hover:underline"
              >
                Empezar onboarding
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
