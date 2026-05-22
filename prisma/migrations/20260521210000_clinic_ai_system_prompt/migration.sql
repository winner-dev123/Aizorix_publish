-- Optional clinic-level override of the AI system prompt template.
-- NULL = use the baked-in default in src/server/ai/prompt.ts.
ALTER TABLE "Clinic" ADD COLUMN "aiSystemPrompt" TEXT;
