"use client";

import * as React from "react";

/**
 * Subscribes to the user's `prefers-reduced-motion` media query. Uses
 * `useSyncExternalStore` so the result is reactive to changes (e.g. the
 * user toggles the system-wide reduced-motion preference) and matches
 * the SSR/CSR boundary cleanly:
 *   - Server render: returns `false` (assume full motion).
 *   - Client render: returns the actual media-query state.
 *
 * The `noop`/`subscribe` constants live at module scope so the function
 * identities stay stable across renders — required by useSyncExternalStore.
 */

const subscribe = (callback: () => void) => {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

const getSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
