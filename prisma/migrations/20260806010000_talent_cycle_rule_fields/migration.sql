-- AlterTable: cycle rule detail fields
ALTER TABLE "TalentProject"
  ADD COLUMN IF NOT EXISTS "cycleMonths"   TEXT,
  ADD COLUMN IF NOT EXISTS "cycleStartDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "cycleEndDay"   INTEGER;
