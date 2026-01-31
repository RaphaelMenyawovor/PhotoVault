/*
  Warnings:

  - A unique constraint covering the columns `[magicLinkToken]` on the table `albums` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "magicLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "magicLinkToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "albums_magicLinkToken_key" ON "albums"("magicLinkToken");
