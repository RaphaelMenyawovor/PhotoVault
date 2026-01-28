-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "password" TEXT;

-- CreateTable
CREATE TABLE "shared_albums" (
    "albumId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_albums_pkey" PRIMARY KEY ("albumId","userId")
);

-- AddForeignKey
ALTER TABLE "shared_albums" ADD CONSTRAINT "shared_albums_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_albums" ADD CONSTRAINT "shared_albums_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
