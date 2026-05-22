import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Stagger wraps a group of children and gives each one an incrementing
 * `animation-delay` so they fade in sequentially. Pure CSS — no JS,
 * respects prefers-reduced-motion.
 *
 *   <Stagger gap={100}>
 *     <StatCard ... />
 *     <StatCard ... />
 *     <StatCard ... />
 *   </Stagger>
 *
 * `gap` is the per-child delay in milliseconds (default 90).
 *
 * Children are wrapped in a transparent <div> with `anim-fade-up` and an
 * inline `animation-delay` so we don't pollute the children's own
 * `className` prop. Works with any child component.
 */

export interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Per-child delay in ms (default 90). */
  gap?: number;
  /** Starting delay in ms (default 0). */
  startDelay?: number;
  /** Render each child without the wrapper div (use only if children already animate). */
  unwrap?: boolean;
}

export function Stagger({
  gap = 90,
  startDelay = 0,
  unwrap = false,
  className,
  children,
  ...props
}: StaggerProps) {
  const items = React.Children.toArray(children);
  return (
    <div className={cn(className)} {...props}>
      {items.map((child, i) => {
        const delay = startDelay + i * gap;
        if (unwrap && React.isValidElement(child)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = child as React.ReactElement<any>;
          return React.cloneElement(c, {
            key: c.key ?? i,
            className: cn("anim-fade-up", c.props.className),
            style: { ...(c.props.style ?? {}), animationDelay: `${delay}ms` },
          });
        }
        return (
          <div
            key={i}
            className="anim-fade-up"
            style={{ animationDelay: `${delay}ms` }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
