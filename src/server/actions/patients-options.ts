/**
 * Constants shared between `src/server/actions/patients.ts` (server actions)
 * and the new/edit patient form components.
 *
 * Plain module — NOT "use server". A "use server" file wraps every export
 * as an encrypted server-action reference, so a client that imports a
 * constant from it gets an opaque proxy object and `.map()` throws.
 *
 * `Patient.gender` is nullable, so the empty-string option ("Sin
 * especificar") in the forms maps to null at the action boundary — we
 * don't put it in this catalogue.
 */
export const PATIENT_GENDER_OPTIONS = ["FEMALE", "MALE"] as const;
