-- Subscription plan tier (Phase 6.10). Read-only in the dashboard —
-- updated by the platform owner in the DB when a clinic upgrades/downgrades.
-- Existing clinics default to PRO so the read-only widget renders sensibly.
CREATE TYPE "ClinicPlan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

ALTER TABLE "Clinic"
  ADD COLUMN "plan" "ClinicPlan" NOT NULL DEFAULT 'PRO';
