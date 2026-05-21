/**
 * Constants shared between `src/server/actions/clinic.ts` (server actions)
 * and the matching client form components.
 *
 * This file does NOT have "use server" — that's the whole point. A file
 * marked "use server" wraps every export as an encrypted server-action
 * reference, so a client that imports a constant from it gets an opaque
 * proxy object instead of the array, and `.map()` throws.
 */

export const CLINIC_TIMEZONE_OPTIONS = [
  "Europe/Madrid",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/New_York",
] as const;

export const CLINIC_LOCALE_OPTIONS = ["es-ES", "es-MX", "es-AR", "pt-BR", "en-US"] as const;

export const CLINIC_AI_TONE_OPTIONS = ["FORMAL", "CASUAL", "NEUTRAL"] as const;
