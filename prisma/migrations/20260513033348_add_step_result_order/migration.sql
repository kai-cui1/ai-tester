-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestStepResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseResultId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'skipped',
    "order" INTEGER NOT NULL DEFAULT 0,
    "request" TEXT,
    "response" TEXT,
    "assertion" TEXT,
    "extractedVar" TEXT,
    "error" TEXT,
    "browser" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TestStepResult_caseResultId_fkey" FOREIGN KEY ("caseResultId") REFERENCES "TestCaseResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TestStepResult" ("assertion", "browser", "caseResultId", "durationMs", "error", "extractedVar", "id", "request", "response", "status", "stepId", "stepName", "stepType") SELECT "assertion", "browser", "caseResultId", "durationMs", "error", "extractedVar", "id", "request", "response", "status", "stepId", "stepName", "stepType" FROM "TestStepResult";
DROP TABLE "TestStepResult";
ALTER TABLE "new_TestStepResult" RENAME TO "TestStepResult";
CREATE INDEX "TestStepResult_caseResultId_idx" ON "TestStepResult"("caseResultId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
