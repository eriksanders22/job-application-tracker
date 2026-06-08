-- AlterTable
ALTER TABLE "JobEmail" ADD COLUMN     "classificationSource" TEXT,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION,
ADD COLUMN     "matchedPhrase" TEXT;
