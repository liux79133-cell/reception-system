-- CreateTable
CREATE TABLE "Honor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT '市级',
    "category" TEXT NOT NULL DEFAULT '其他',
    "subject" TEXT,
    "issuedBy" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "awardedAt" TIMESTAMP(3),
    "remark" TEXT,
    "attachments" TEXT,
    "feishuRecordId" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Honor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HonorFile" (
    "id" SERIAL NOT NULL,
    "honorId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT,
    "size" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HonorFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Honor_feishuRecordId_key" ON "Honor"("feishuRecordId");

-- AddForeignKey
ALTER TABLE "HonorFile" ADD CONSTRAINT "HonorFile_honorId_fkey" FOREIGN KEY ("honorId") REFERENCES "Honor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
