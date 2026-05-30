import Link from "next/link";
import { Cloud, Lock, ShieldCheck } from "lucide-react";
import { AizorixLogo } from "@/components/brand/aizorix-logo";
import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getServerT } from "@/i18n/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getTheme();
  const { t } = await getServerT();
  return (
    <div className="relative flex min-h-screen flex-1 flex-col aurora-bg dark:bg-[color:var(--color-background)] dark:[background-image:none]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] dark:opacity-10"
      />
      {/* Violet aurora glow for dark mode */}
      <span
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(50% 40% at 15% 10%, rgba(139,92,246,0.30) 0%, transparent 60%), radial-gradient(45% 35% at 90% 90%, rgba(56,189,248,0.18) 0%, transparent 60%)",
        }}
      />

      <header className="border-b border-[color:var(--color-ink-100)]/70 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="transition hover:opacity-90">
            <AizorixLogo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher tone="light" align="right" />
            <ThemeToggle current={theme} tone="light" align="right" />
            <Link
              href="/app"
              className="hidden text-xs font-semibold text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)] sm:inline dark:text-white/60 dark:hover:text-white"
            >
              {t.onboarding.saveAndExit} →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:py-14">
        {children}
      </main>

      <footer className="border-t border-[color:var(--color-ink-100)]/70 bg-white/60 py-5 backdrop-blur dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
          <AizorixLogo />
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--color-ink-700)] dark:text-white/70" />
              {t.onboarding.footerGdpr}
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[color:var(--color-ink-700)] dark:text-white/70" />
              {t.onboarding.footerSecure}
            </span>
            <span className="flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-[color:var(--color-ink-700)] dark:text-white/70" />
              {t.onboarding.footerCloud}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
