-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "deletedAt" TIMESTAMP(3);
