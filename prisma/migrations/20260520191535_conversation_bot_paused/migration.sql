-- Pause-bot toggle per conversation. When true, the orchestrator records the
-- inbound message but skips the LLM round-trip and outbound send.
ALTER TABLE "Conversation" ADD COLUMN "botPaused" BOOLEAN NOT NULL DEFAULT false;
