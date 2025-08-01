/*
  Warnings:

  - Added the required column `number` to the `snapshots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "blobs" ALTER COLUMN "hash" DROP DEFAULT;

-- AlterTable
ALTER TABLE "snapshots" ADD COLUMN     "number" INTEGER NOT NULL;
