-- AlterTable: add extra fields to TalentProject
ALTER TABLE "TalentProject"
  ADD COLUMN IF NOT EXISTS "cycleType"     TEXT,
  ADD COLUMN IF NOT EXISTS "applyUrl"      TEXT,
  ADD COLUMN IF NOT EXISTS "contactNote"   TEXT,
  ADD COLUMN IF NOT EXISTS "policyDesc"    TEXT,
  ADD COLUMN IF NOT EXISTS "policyLinks"   TEXT,
  ADD COLUMN IF NOT EXISTS "attachments"   TEXT,
  ADD COLUMN IF NOT EXISTS "cycleTemplate" TEXT;
