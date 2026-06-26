ALTER TABLE "JobApplication"
  ADD COLUMN "gmailThreadId" TEXT,
  ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "latestEmailAt" TIMESTAMP(3),
  ADD COLUMN "latestSubject" TEXT;

ALTER TABLE "JobEmail"
  RENAME COLUMN "applicationId" TO "jobApplicationId";

ALTER TABLE "JobEmail"
  RENAME COLUMN "threadId" TO "gmailThreadId";

ALTER INDEX IF EXISTS "JobEmail_applicationId_idx"
  RENAME TO "JobEmail_jobApplicationId_idx";

ALTER TABLE "JobEmail"
  RENAME CONSTRAINT "JobEmail_applicationId_fkey" TO "JobEmail_jobApplicationId_fkey";

WITH latest_email AS (
  SELECT DISTINCT ON ("jobApplicationId")
    "jobApplicationId",
    "gmailThreadId",
    "receivedAt",
    "subject"
  FROM "JobEmail"
  WHERE "jobApplicationId" IS NOT NULL
  ORDER BY "jobApplicationId", "receivedAt" DESC, "createdAt" DESC
)
UPDATE "JobApplication" application
SET
  "gmailThreadId" = latest_email."gmailThreadId",
  "latestEmailAt" = latest_email."receivedAt",
  "latestSubject" = latest_email."subject",
  "lastEmailDate" = latest_email."receivedAt",
  "isActive" = CASE
    WHEN application."status" = 'rejected' THEN false
    WHEN application."status" IN ('waiting', 'needs_action') THEN true
    ELSE application."isActive"
  END
FROM latest_email
WHERE application."id" = latest_email."jobApplicationId";

WITH ranked_applications AS (
  SELECT
    "id",
    "userId",
    "gmailThreadId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "gmailThreadId"
      ORDER BY COALESCE("latestEmailAt", "lastEmailDate") DESC, "createdAt" ASC
    ) AS rank,
    FIRST_VALUE("id") OVER (
      PARTITION BY "userId", "gmailThreadId"
      ORDER BY COALESCE("latestEmailAt", "lastEmailDate") DESC, "createdAt" ASC
    ) AS canonical_id
  FROM "JobApplication"
  WHERE "gmailThreadId" IS NOT NULL
),
duplicate_applications AS (
  SELECT "id", canonical_id
  FROM ranked_applications
  WHERE rank > 1
)
UPDATE "JobEmail" email
SET "jobApplicationId" = duplicate_applications.canonical_id
FROM duplicate_applications
WHERE email."jobApplicationId" = duplicate_applications."id";

WITH ranked_applications AS (
  SELECT
    "id",
    "userId",
    "gmailThreadId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "gmailThreadId"
      ORDER BY COALESCE("latestEmailAt", "lastEmailDate") DESC, "createdAt" ASC
    ) AS rank,
    FIRST_VALUE("id") OVER (
      PARTITION BY "userId", "gmailThreadId"
      ORDER BY COALESCE("latestEmailAt", "lastEmailDate") DESC, "createdAt" ASC
    ) AS canonical_id
  FROM "JobApplication"
  WHERE "gmailThreadId" IS NOT NULL
),
duplicate_applications AS (
  SELECT "id", canonical_id
  FROM ranked_applications
  WHERE rank > 1
)
UPDATE "Todo" todo
SET "applicationId" = duplicate_applications.canonical_id
FROM duplicate_applications
WHERE todo."applicationId" = duplicate_applications."id";

WITH ranked_applications AS (
  SELECT
    "id",
    "userId",
    "gmailThreadId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "gmailThreadId"
      ORDER BY COALESCE("latestEmailAt", "lastEmailDate") DESC, "createdAt" ASC
    ) AS rank
  FROM "JobApplication"
  WHERE "gmailThreadId" IS NOT NULL
)
DELETE FROM "JobApplication" application
USING ranked_applications
WHERE application."id" = ranked_applications."id"
  AND ranked_applications.rank > 1;

WITH latest_email AS (
  SELECT DISTINCT ON ("jobApplicationId")
    "jobApplicationId",
    "receivedAt",
    "subject"
  FROM "JobEmail"
  WHERE "jobApplicationId" IS NOT NULL
  ORDER BY "jobApplicationId", "receivedAt" DESC, "createdAt" DESC
)
UPDATE "JobApplication" application
SET
  "latestEmailAt" = latest_email."receivedAt",
  "latestSubject" = latest_email."subject",
  "lastEmailDate" = latest_email."receivedAt"
FROM latest_email
WHERE application."id" = latest_email."jobApplicationId";

CREATE UNIQUE INDEX "JobApplication_userId_gmailThreadId_key"
  ON "JobApplication"("userId", "gmailThreadId");

CREATE INDEX "JobEmail_gmailThreadId_idx"
  ON "JobEmail"("gmailThreadId");
