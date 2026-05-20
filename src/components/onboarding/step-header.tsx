import { cn } from "@/lib/utils";

interface StepHeaderProps {
  num: number;
  title: string;
  description: string;
  className?: string;
}

export function StepHeader({ num, title, description, className }: StepHeaderProps) {
  return (
    <div className={cn("flex items-start gap-5", className)}>
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#ffd24a] via-[#f5c842] to-[#ff8a5b] text-xl font-black text-[color:var(--color-ink-900)] shadow-[0_14px_36px_-12px_rgba(255,138,91,0.55)]">
        <span
          aria-hidden
          className="absolute inset-[3px] rounded-[15px] opacity-70"
          style={{
            background:
              "radial-gradient(80% 80% at 20% 0%, rgba(255,255,255,0.65) 0%, transparent 60%)",
          }}
        />
        <span className="relative">{num}</span>
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-3xl font-black tracking-[-0.02em] text-[color:var(--color-ink-900)]">
          {title}
        </h2>
        <p className="mt-1.5 max-w-3xl text-base text-[color:var(--color-ink-500)]">
          {description}
        </p>
      </div>
    </div>
  );
}
