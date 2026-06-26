ALTER TABLE "JobEmail"
  ADD COLUMN "emailType" TEXT,
  ADD COLUMN "isApplicationAnchor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "matchStatus" TEXT NOT NULL DEFAULT 'attached',
  ADD COLUMN "matchReason" TEXT,
  ADD COLUMN "needsReviewReason" TEXT,
  ADD COLUMN "suggestedJobApplicationId" TEXT;

CREATE INDEX "JobEmail_matchStatus_idx" ON "JobEmail"("matchStatus");
