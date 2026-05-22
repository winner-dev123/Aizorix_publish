import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Uses the `skeleton-shimmer` keyframe defined in
 * globals.css — violet shimmer left-to-right on a faint violet ground so
 * loading states match the brand instead of going grey.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-lg",
        className,
      )}
      role="status"
      aria-label="Cargando"
      {...props}
    />
  );
}

/** Convenience: a row of N short skeleton lines for table rows / list items. */
export function SkeletonLines({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: `${75 + ((i * 13) % 25)}%` }}
        />
      ))}
    </div>
  );
}
