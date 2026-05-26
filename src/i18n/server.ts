import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/**
 * Reads the active locale from the cookie (server-side). Falls back to the
 * default when the cookie is missing or invalid. `cookies()` is async in
 * Next 15+, so this returns a promise.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Server-side translations. Use in any server component:
 *
 *   const { t, locale } = await getServerT();
 *   <h1>{t.signin.welcome}</h1>
 *
 * Returns the whole dictionary as `t` (typed), so usage is just property
 * access — no string-key indirection, full autocomplete + compile safety.
 */
export async function getServerT(): Promise<{
  locale: Locale;
  t: Dictionary;
}> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
