ALTER TABLE "JobApplication"
  ALTER COLUMN "company" DROP NOT NULL,
  ALTER COLUMN "role" DROP NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'unclassified',
  ALTER COLUMN "confidenceScore" DROP NOT NULL,
  ADD COLUMN "classificationReason" TEXT,
  ADD COLUMN "classificationSource" TEXT DEFAULT 'gemini',
  ADD COLUMN "actionItem" TEXT,
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "classifiedAt" TIMESTAMP(3);

ALTER TABLE "JobEmail"
  ADD COLUMN "fromName" TEXT,
  ADD COLUMN "bodyText" TEXT;
