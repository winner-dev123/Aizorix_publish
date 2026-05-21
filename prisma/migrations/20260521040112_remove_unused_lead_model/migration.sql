-- Lead model was defined but never used: the orchestrator's
-- `find_or_create_patient` tool creates Patient directly, the seed doesn't
-- insert any Lead rows, and no code path queries the Lead table. Dropping
-- it cleans up the schema. Add it back later if/when a real lead-vs-patient
-- distinction is needed.
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_leadId_fkey";
ALTER TABLE "HumanHandoff" DROP CONSTRAINT IF EXISTS "HumanHandoff_leadId_fkey";
ALTER TABLE "Lead"         DROP CONSTRAINT IF EXISTS "Lead_clinicId_fkey";
ALTER TABLE "Lead"         DROP CONSTRAINT IF EXISTS "Lead_patientId_fkey";

ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "leadId";
ALTER TABLE "HumanHandoff" DROP COLUMN IF EXISTS "leadId";

DROP INDEX IF EXISTS "Lead_clinicId_phone_idx";
DROP TABLE IF EXISTS "Lead";
