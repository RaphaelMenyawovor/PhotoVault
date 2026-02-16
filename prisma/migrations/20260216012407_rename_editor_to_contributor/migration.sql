/*
  Warnings:

  - The values [EDITOR] on the enum `AlbumRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AlbumRole_new" AS ENUM ('VIEWER', 'CONTRIBUTOR');
ALTER TABLE "public"."shared_albums" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "shared_albums" ALTER COLUMN "role" TYPE "AlbumRole_new" USING ("role"::text::"AlbumRole_new");
ALTER TYPE "AlbumRole" RENAME TO "AlbumRole_old";
ALTER TYPE "AlbumRole_new" RENAME TO "AlbumRole";
DROP TYPE "public"."AlbumRole_old";
ALTER TABLE "shared_albums" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
COMMIT;
