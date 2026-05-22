import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Fade + rise entrance animation. Uses the `anim-fade-up` keyframe defined
 * in globals.css — respects prefers-reduced-motion via the existing
 * @media reduce override in that file.
 *
 * Props:
 *   - `delay`  0-7  index into the staggered delay scale (80ms each).
 *   - `as`     element to render (default "div").
 *
 * This is a tiny pure-CSS abstraction; once we adopt Framer Motion in a
 * later phase the import + props stay the same.
 */

const DELAYS = [
  "",
  "[animation-delay:80ms]",
  "[animation-delay:160ms]",
  "[animation-delay:240ms]",
  "[animation-delay:320ms]",
  "[animation-delay:400ms]",
  "[animation-delay:480ms]",
  "[animation-delay:560ms]",
] as const;

export interface FadeProps extends React.HTMLAttributes<HTMLElement> {
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Fade({
  delay = 0,
  as: Tag = "div",
  className,
  children,
  ...props
}: FadeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as any;
  return (
    <Component
      className={cn("anim-fade-up", DELAYS[delay], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
