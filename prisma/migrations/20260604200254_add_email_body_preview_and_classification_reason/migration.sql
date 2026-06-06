-- AlterTable
ALTER TABLE "JobEmail" ADD COLUMN     "bodyPreview" TEXT,
ADD COLUMN     "classificationReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
