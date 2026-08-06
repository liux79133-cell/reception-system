ALTER TABLE "TalentCycle" ADD COLUMN IF NOT EXISTS "nodeStatuses" TEXT;
ALTER TABLE "TalentTask"  ADD COLUMN IF NOT EXISTS "cycleId"     INTEGER;
ALTER TABLE "TalentTask"  ADD COLUMN IF NOT EXISTS "nodeLabel"   TEXT;
-- update status enum to support pending|doing|done
-- (existing 'pending'/'done' values remain valid, 'doing' is new)

ALTER TABLE "TalentTask" ADD CONSTRAINT "TalentTask_cycleId_fkey"
  FOREIGN KEY ("cycleId") REFERENCES "TalentCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;
