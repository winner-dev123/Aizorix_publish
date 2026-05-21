/**
 * Constants shared between `src/server/actions/staff.ts` (server actions)
 * and the staff-list client component. Plain module — NOT "use server" —
 * so client imports get the actual array, not a server-action proxy.
 */

export const STAFF_ROLE_OPTIONS = ["OWNER", "ADMIN", "RECEPTIONIST", "STAFF"] as const;
