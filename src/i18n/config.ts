/**
 * i18n configuration. Locale is stored in a cookie (no URL prefix, no
 * middleware) so server components can read it via next/headers and
 * re-render translated on navigation/refresh — keeping the existing
 * routing untouched.
 */

export const LOCALES = ["es", "en", "fr", "pt", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_COOKIE = "aizorix_locale";

/** Display metadata for the language switcher. */
export const LOCALE_META: Record<
  Locale,
  { label: string; native: string; flag: string }
> = {
  es: { label: "Spanish", native: "Español", flag: "🇪🇸" },
  en: { label: "English", native: "English", flag: "🇬🇧" },
  fr: { label: "French", native: "Français", flag: "🇫🇷" },
  pt: { label: "Portuguese", native: "Português", flag: "🇵🇹" },
  de: { label: "German", native: "Deutsch", flag: "🇩🇪" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Maps our locale to a BCP-47 tag for the <html lang> attribute. */
export const HTML_LANG: Record<Locale, string> = {
  es: "es-ES",
  en: "en",
  fr: "fr",
  pt: "pt-PT",
  de: "de",
};
