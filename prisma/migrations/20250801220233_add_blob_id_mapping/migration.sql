/*
  Warnings:

  - You are about to drop the column `blobId` on the `objects` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "objects" DROP CONSTRAINT "objects_blobId_fkey";

-- AlterTable
ALTER TABLE "objects" DROP COLUMN "blobId",
ADD COLUMN     "blob_id" INTEGER;

-- AddForeignKey
ALTER TABLE "objects" ADD CONSTRAINT "objects_blob_id_fkey" FOREIGN KEY ("blob_id") REFERENCES "blobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
