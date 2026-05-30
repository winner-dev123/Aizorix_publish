import "server-only";
import { cookies } from "next/headers";

/**
 * Theme switching for the whole app. The active value is stored in a
 * cookie so server components can read it via next/headers and inject
 * `data-theme="dark"` onto <html> server-side — no flash of light theme
 * on first paint, no client-only flicker.
 *
 * "system" defers to the user's OS preference (handled in the client by
 * a tiny inline script in the root layout that reads the prefers-color-
 * scheme media query and sets data-theme accordingly before React
 * hydrates). For the server-only initial render we treat "system" as
 * "light" — the client script corrects it within milliseconds.
 */

export type Theme = "light" | "dark" | "system";
export const THEMES: readonly Theme[] = ["light", "dark", "system"];
export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = "aizorix_theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

/**
 * Resolves a theme to the concrete `light` or `dark` value the server
 * should render with. `system` falls back to light at SSR — the inline
 * <script> in the root layout swaps it before hydration when the user
 * actually prefers dark.
 */
export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? "light" : theme;
}
