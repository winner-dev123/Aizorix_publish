-- Per-clinic module feature toggles (Phase 6.9). Defaults to all modules
-- enabled so existing clinics keep their current behavior; the settings
-- sub-page at /app/settings/modulos lets OWNER/ADMIN flip them off.
ALTER TABLE "Clinic"
  ADD COLUMN "activeModules" TEXT[] NOT NULL DEFAULT ARRAY['pipeline','campaigns','metrics','ai-demo','agenda'];
