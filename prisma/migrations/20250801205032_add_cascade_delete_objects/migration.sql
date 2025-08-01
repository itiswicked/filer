-- DropForeignKey
ALTER TABLE "objects" DROP CONSTRAINT "objects_snapshot_id_fkey";

-- AddForeignKey
ALTER TABLE "objects" ADD CONSTRAINT "objects_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
