-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "exifData" JSONB,
ADD COLUMN     "takenAt" TIMESTAMP(3);
