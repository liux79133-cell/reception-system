-- CreateTable TalentCompany
CREATE TABLE "TalentCompany" (
    "id"          SERIAL NOT NULL,
    "projectId"   INTEGER NOT NULL,
    "name"        TEXT NOT NULL,
    "owner"       TEXT,
    "ownerFeishu" TEXT,
    "contact"     TEXT,
    "remark"      TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TalentCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable TalentTask
CREATE TABLE "TalentTask" (
    "id"        SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "title"     TEXT NOT NULL,
    "desc"      TEXT,
    "assignee"  TEXT,
    "dueDate"   TEXT,
    "status"    TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TalentTask_pkey" PRIMARY KEY ("id")
);

-- AlterTable TalentCycle: add companyId
ALTER TABLE "TalentCycle" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;

-- AddForeignKey
ALTER TABLE "TalentCompany" ADD CONSTRAINT "TalentCompany_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TalentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentCycle"   ADD CONSTRAINT "TalentCycle_companyId_fkey"   FOREIGN KEY ("companyId")  REFERENCES "TalentCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TalentTask"    ADD CONSTRAINT "TalentTask_projectId_fkey"    FOREIGN KEY ("projectId")  REFERENCES "TalentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentTask"    ADD CONSTRAINT "TalentTask_companyId_fkey"    FOREIGN KEY ("companyId")  REFERENCES "TalentCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
