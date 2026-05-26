import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";
import { es, type Dictionary } from "./dictionaries/es";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { pt } from "./dictionaries/pt";
import { de } from "./dictionaries/de";

const DICTIONARIES: Record<Locale, Dictionary> = { es, en, fr, pt, de };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type { Dictionary };
