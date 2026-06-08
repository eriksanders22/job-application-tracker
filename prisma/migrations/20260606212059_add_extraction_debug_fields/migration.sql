-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "companySource" TEXT,
ADD COLUMN     "roleSource" TEXT;

-- AlterTable
ALTER TABLE "JobEmail" ADD COLUMN     "jobRelatedScore" DOUBLE PRECISION,
ADD COLUMN     "matchedJobRules" TEXT,
ADD COLUMN     "matchedStatusRule" TEXT;
