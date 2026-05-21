-- AI receptionist config edited from /app/settings/ai. Tone steers
-- de/tú/usted; guidance is appended as a free-text block to the system prompt.
CREATE TYPE "AiTone" AS ENUM ('FORMAL', 'CASUAL', 'NEUTRAL');

ALTER TABLE "Clinic"
  ADD COLUMN "aiTone"     "AiTone" NOT NULL DEFAULT 'NEUTRAL',
  ADD COLUMN "aiGuidance" TEXT;
