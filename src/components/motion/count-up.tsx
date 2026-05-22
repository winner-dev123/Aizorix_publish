"use client";

import * as React from "react";

/**
 * Animated number that counts up from 0 (or `from`) to `to` when it scrolls
 * into the viewport. Uses requestAnimationFrame, no dependencies. Honors
 * prefers-reduced-motion by jumping straight to the final value.
 *
 *   <CountUp to={128} suffix=" %" duration={1200} />
 *
 * `formatter` lets you override the rendered string entirely (e.g. for
 * locale-aware grouping); takes priority over `prefix`/`suffix`.
 */
export interface CountUpProps {
  to: number;
  from?: number;
  /** Total duration of the animation in ms. Default 1200. */
  duration?: number;
  /** Number of decimal places to render. Default 0. */
  decimals?: number;
  /** Text appended after the number (e.g. " h", " %"). */
  suffix?: string;
  /** Text prepended before the number (e.g. "€"). */
  prefix?: string;
  /** Override the rendered string entirely. */
  formatter?: (value: number) => string;
  /** When false, only starts when the element enters the viewport. Default true. */
  triggerOnView?: boolean;
  className?: string;
}

export function CountUp({
  to,
  from = 0,
  duration = 1200,
  decimals = 0,
  suffix = "",
  prefix = "",
  formatter,
  triggerOnView = true,
  className,
}: CountUpProps) {
  const [value, setValue] = React.useState<number>(triggerOnView ? from : to);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      // Defer to a microtask so the lint rule (which flags synchronous
      // setState in effects) is satisfied. We still want to surface the
      // final value when reduced motion is on.
      queueMicrotask(() => setValue(to));
      started.current = true;
      return;
    }

    const start = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = now - t0;
        const progress = Math.min(1, elapsed / duration);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(from + (to - from) * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else setValue(to);
      };
      requestAnimationFrame(tick);
    };

    if (!triggerOnView) {
      start();
      return;
    }

    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            start();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [from, to, duration, triggerOnView]);

  const rendered = formatter
    ? formatter(value)
    : `${prefix}${value.toFixed(decimals)}${suffix}`;

  return (
    <span ref={ref} className={className}>
      {rendered}
    </span>
  );
}
