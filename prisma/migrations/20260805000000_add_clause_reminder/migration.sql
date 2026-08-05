-- CreateTable
CREATE TABLE "ClauseReminder" (
    "id"           SERIAL NOT NULL,
    "title"        TEXT NOT NULL,
    "articleRef"   TEXT NOT NULL DEFAULT '',
    "description"  TEXT NOT NULL DEFAULT '',
    "dueType"      TEXT NOT NULL DEFAULT 'date',
    "dueDate"      TEXT,
    "dueRecurring" TEXT DEFAULT '',
    "priority"     TEXT NOT NULL DEFAULT 'normal',
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "clauseText"   TEXT DEFAULT '',
    "fileId"       INTEGER,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdById"  INTEGER,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClauseReminder_pkey" PRIMARY KEY ("id")
);
