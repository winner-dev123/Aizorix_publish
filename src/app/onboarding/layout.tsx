import Link from "next/link";
import { Cloud, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { AizorixLogo } from "@/components/brand/aizorix-logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col aurora-bg">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      <header className="border-b border-[color:var(--color-ink-100)]/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="transition hover:opacity-90">
            <AizorixLogo />
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink-200)] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-600)] backdrop-blur">
              <Sparkles className="h-3 w-3 text-[color:var(--color-brand-500)]" />
              Onboarding inteligente
            </span>
            <Link
              href="/app"
              className="text-xs font-semibold text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
            >
              Saltar al CRM →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:py-14">
        {children}
      </main>

      <footer className="border-t border-[color:var(--color-ink-100)]/70 bg-white/60 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-[color:var(--color-ink-500)]">
          <AizorixLogo />
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--color-ink-700)]" />
              RGPD
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[color:var(--color-ink-700)]" />
              Seguro
            </span>
            <span className="flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-[color:var(--color-ink-700)]" />
              100% nube
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
