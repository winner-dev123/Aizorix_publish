"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/**
 * Persists the chosen locale in a cookie. The client switcher calls this
 * then triggers router.refresh() so every server component re-renders in
 * the new language. One year max-age; lax same-site is enough (no
 * cross-site posting of the preference).
 */
export async function setLocaleAction(locale: string): Promise<{ ok: boolean }> {
  if (!isLocale(locale)) return { ok: false };
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true };
}
