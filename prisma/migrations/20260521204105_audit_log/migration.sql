-- Append-only audit log of staff actions. Written by src/server/audit.ts.
-- Surfaced read-only on /app/settings/audit.
CREATE TABLE "AuditLog" (
  "id"          TEXT NOT NULL,
  "clinicId"    TEXT NOT NULL,
  "actorUserId" TEXT,
  "action"      TEXT NOT NULL,
  "target"      TEXT,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_clinicId_createdAt_idx"
  ON "AuditLog" ("clinicId", "createdAt");

CREATE INDEX "AuditLog_clinicId_action_createdAt_idx"
  ON "AuditLog" ("clinicId", "action", "createdAt");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
