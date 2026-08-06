-- CreateTable
CREATE TABLE "TalentProject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT '市级',
    "region" TEXT NOT NULL DEFAULT '苏州市',
    "category" TEXT NOT NULL DEFAULT '其他',
    "isFocus" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentCycle" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "deadline" TEXT,
    "status" TEXT NOT NULL DEFAULT '待申报',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentApplicant" (
    "id" SERIAL NOT NULL,
    "cycleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "department" TEXT,
    "amount" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT '待申报',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentApplicant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TalentCycle" ADD CONSTRAINT "TalentCycle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TalentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentApplicant" ADD CONSTRAINT "TalentApplicant_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TalentCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
