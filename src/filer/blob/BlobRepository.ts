import { prisma } from '../../lib/prisma';
import { Prisma, Blob as PrismaBlob } from '@prisma/client';

export class BlobRepository {
  /**
   * Get blob IDs that are only referenced by objects in the specified snapshot
   * These blobs are safe to delete when pruning the snapshot
   */
  async findBlobsReferencedOnlyBySnapshot(snapshotId: number): Promise<number[]> {
    const objects = await prisma.$queryRaw<Array<{blob_id: number}>>`
      SELECT DISTINCT o1.blob_id
      FROM objects o1
      LEFT JOIN objects o2 ON o1.blob_id = o2.blob_id
        AND o2.snapshot_id != ${snapshotId}
      WHERE o1.snapshot_id = ${snapshotId}
        AND o1.blob_id IS NOT NULL
        AND o2.blob_id IS NULL
    `;

    return objects.map(object => object.blob_id);
  }

  /**
   * Delete blobs by their IDs within a transaction
   */
  async deleteMany(blobIds: number[]): Promise<number> {
    if (blobIds.length === 0) return 0;

    const result = await prisma.blob.deleteMany({
      where: { id: { in: blobIds } }
    });

    return result.count;
  }

  /**
   * Find existing blobs by their hashes (safer for deduplication)
   */
  async findManyByHashes(hashes: string[]): Promise<PrismaBlob[]> {
    if (hashes.length === 0) return [];

    return await prisma.blob.findMany({
      where: { hash: { in: hashes } }
    });
  }
  async createMany(blobs: Prisma.BlobCreateManyInput[]): Promise<PrismaBlob[]> {
    if (blobs.length === 0) return [];
    return await prisma.blob.createManyAndReturn({ data: blobs });
  }
}