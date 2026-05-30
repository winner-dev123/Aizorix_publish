import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepHeaderProps {
  /** 1-based step number — rendered as the "1." prefix on the title. */
  num: number;
  /** Full title (e.g. "Servicios y agenda"). */
  title: string;
  /** Word(s) inside `title` to render with the violet gradient highlight. */
  highlight?: string;
  /** One-liner shown under the title. */
  description: string;
  /** Eyebrow text rendered as a pill above the title. */
  eyebrow?: string;
  className?: string;
}

/**
 * Reference shape (from the Aizorix AI mocks):
 *
 *   ✦ Onboarding inteligente
 *
 *   2. Servicios y AGENDA              ← `agenda` is highlighted in violet
 *   Configura tus tratamientos…
 *
 * The highlight is matched word-by-word so titles can mark *any* keyword
 * (e.g. "tu IA" → highlight the last two words). Case-insensitive match.
 */
export function StepHeader({
  num,
  title,
  highlight,
  description,
  eyebrow = "Onboarding inteligente",
  className,
}: StepHeaderProps) {
  const rendered = renderTitle(title, highlight);

  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink-200)] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-600)] backdrop-blur dark:border-white/15 dark:bg-white/[0.05] dark:text-white/75">
        <Sparkles className="h-3 w-3 text-[color:var(--color-brand-500)] dark:text-[color:var(--color-brand-300)]" />
        {eyebrow}
      </span>
      <h1 className="text-4xl font-black leading-tight tracking-[-0.02em] text-[color:var(--color-ink-900)] md:text-5xl dark:text-white">
        <span className="text-[color:var(--color-ink-400)] dark:text-white/55">
          {num}.{" "}
        </span>
        {rendered}
      </h1>
      <p className="max-w-3xl text-base text-[color:var(--color-ink-500)] dark:text-white/70">
        {description}
      </p>
    </div>
  );
}

/**
 * Wrap any occurrence of `highlight` inside `title` with a violet-gradient
 * span. Matching is case-insensitive and only the first occurrence is wrapped
 * (titles are short and only ever contain one highlight). When `highlight` is
 * missing or not found, the title is rendered as plain text.
 */
function renderTitle(title: string, highlight?: string): React.ReactNode {
  if (!highlight) return title;
  const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return title;
  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + highlight.length);
  const after = title.slice(idx + highlight.length);
  return (
    <>
      {before}
      <span className="text-brand-gradient">{match}</span>
      {after}
    </>
  );
}
