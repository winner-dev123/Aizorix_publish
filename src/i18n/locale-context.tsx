"use client";

import * as React from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";

/**
 * Client-side access to the active locale + dictionary. The provider is
 * seeded by the root layout (server component) with the locale read from
 * the cookie and the matching dictionary, so client and server render the
 * same language with no flash.
 */

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ locale, t: dictionary }),
    [locale, dictionary],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Returns `{ t, locale }` for client components. `t` is the full typed
 * dictionary — access translations as `t.nav.dashboard`.
 */
export function useT(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useT() must be used inside <LocaleProvider>");
  }
  return ctx;
}
