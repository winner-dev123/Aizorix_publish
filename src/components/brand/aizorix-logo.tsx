import { cn } from "@/lib/utils";

interface AizorixLogoProps {
  className?: string;
  variant?: "full" | "mark";
  tone?: "light" | "dark";
}

export function AizorixLogo({
  className,
  variant = "full",
  tone = "light",
}: AizorixLogoProps) {
  const wordColor =
    tone === "dark" ? "text-white" : "text-[color:var(--color-ink-900)]";

  const Mark = (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-[#25d366] via-[#14b87a] to-[#0d9488]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_22px_-10px_rgba(13,148,136,0.55)]",
      )}
      aria-hidden
    >
      <span
        className="absolute inset-[2px] rounded-[14px] opacity-80"
        style={{
          background:
            "radial-gradient(80% 80% at 20% 0%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        className="relative h-5 w-5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 3.2 L4 19 H7.5 L12 9 L16.5 19 H20 L12 3.2 Z"
          fill="#1c2440"
        />
        <path
          d="M9.2 14.2 H14.8 L13.6 16.6 H10.4 Z"
          fill="#1c2440"
          opacity="0.78"
        />
      </svg>
    </span>
  );

  if (variant === "mark") {
    return <span className={cn("inline-flex", className)}>{Mark}</span>;
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {Mark}
      <span
        className={cn(
          "text-[19px] font-black tracking-[-0.02em] leading-none",
          wordColor,
        )}
      >
        a<span className="text-[#0d9488]">i</span>zori<span className="text-[#0d9488]">x</span>
      </span>
    </div>
  );
}
