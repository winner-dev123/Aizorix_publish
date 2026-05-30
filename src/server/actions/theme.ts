"use server";

import { cookies } from "next/headers";
import { THEME_COOKIE, isTheme } from "@/lib/theme";

/**
 * Persists the chosen theme in a cookie. The client toggle calls this,
 * then triggers router.refresh() so every server component re-renders
 * with the new `data-theme` attribute on <html>.
 */
export async function setThemeAction(theme: string): Promise<{ ok: boolean }> {
  if (!isTheme(theme)) return { ok: false };
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true };
}
