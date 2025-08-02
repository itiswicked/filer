import { BlobRepository } from '../BlobRepository';
import { prisma } from '../../../lib/prisma';

describe('BlobRepository', () => {
  let blobRepository: BlobRepository;

  beforeAll(async () => {
    blobRepository = new BlobRepository();
  });

  describe('findBlobsReferencedOnlyBySnapshot', () => {
    it('should return blobs only referenced by target snapshot', async () => {
      const directory = await prisma.directory.create({
        data: { path: '/test' }
      });

      const [snapshot1, snapshot2] = await prisma.snapshot.createManyAndReturn({
        data: [
          { directoryId: directory.id, number: 1 },
          { directoryId: directory.id, number: 2 }
        ]
      });

      const [blob1, blob2, blob3] = await prisma.blob.createManyAndReturn({
        data: [
          { data: Buffer.from('file1'), hash: 'hash1' },
          { data: Buffer.from('file2'), hash: 'hash2' },
          { data: Buffer.from('file3'), hash: 'hash3' }
        ]
      });

      await prisma.object.createMany({
        data: [
          // blob1: only in snapshot1 (should be returned)
          { name: 'file1.txt', snapshotId: snapshot1.id, blobId: blob1.id },
          // blob2: in both snapshots (should NOT be returned)
          { name: 'file2.txt', snapshotId: snapshot1.id, blobId: blob2.id },
          { name: 'file2.txt', snapshotId: snapshot2.id, blobId: blob2.id },
          // blob3: only in snapshot2 (should NOT be returned when querying snapshot1)
          { name: 'file3.txt', snapshotId: snapshot2.id, blobId: blob3.id }
        ]
      });

      const result = await blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot1.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(blob1.id);
    });

    it('should handle blobs referenced multiple times within same snapshot', async () => {
      const directory = await prisma.directory.create({
        data: { path: '/test' }
      });

      const snapshot1 = await prisma.snapshot.create({
        data: { directoryId: directory.id, number: 1 }
      });

      const blob1 = await prisma.blob.create({
        data: { data: Buffer.from('shared'), hash: 'shared_hash' }
      });

      // Same blob referenced by multiple objects in same snapshot
      await prisma.object.createMany({
        data: [
          { name: 'copy1.txt', snapshotId: snapshot1.id, blobId: blob1.id },
          { name: 'copy2.txt', snapshotId: snapshot1.id, blobId: blob1.id }
        ]
      });

      const result = await blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot1.id);

      // Should return the blob only once despite multiple references
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(blob1.id);
    });

    it('should ignore directories (objects with null blob_id)', async () => {
      const directory = await prisma.directory.create({
        data: { path: '/test' }
      });

      const snapshot1 = await prisma.snapshot.create({
        data: { directoryId: directory.id, number: 1 }
      });

      const blob1 = await prisma.blob.create({
        data: { data: Buffer.from('file'), hash: 'file_hash' }
      });

      await prisma.object.createMany({
        data: [
          // File object with blob
          { name: 'file.txt', snapshotId: snapshot1.id, blobId: blob1.id },
          // Directory object (no blob)
          { name: '/some/dir', snapshotId: snapshot1.id, blobId: null }
        ]
      });

      const result = await blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot1.id);

      // Should only return the file blob, not consider the directory
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(blob1.id);
    });

    it('should return empty array when no blobs exist', async () => {
      const directory = await prisma.directory.create({
        data: { path: '/test' }
      });

      const snapshot1 = await prisma.snapshot.create({
        data: { directoryId: directory.id, number: 1 }
      });

      const result = await blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot1.id);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when all blobs are shared', async () => {
      const directory = await prisma.directory.create({
        data: { path: '/test' }
      });

      const snapshot1 = await prisma.snapshot.create({
        data: { directoryId: directory.id, number: 1 }
      });

      const snapshot2 = await prisma.snapshot.create({
        data: { directoryId: directory.id, number: 2 }
      });

      const blob1 = await prisma.blob.create({
        data: { data: Buffer.from('shared'), hash: 'shared_hash' }
      });

      await prisma.object.createMany({
        data: [
          { name: 'file.txt', snapshotId: snapshot1.id, blobId: blob1.id },
          { name: 'file.txt', snapshotId: snapshot2.id, blobId: blob1.id }
        ]
      });

      const result = await blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot1.id);

      expect(result).toHaveLength(0);
    });

    it('should handle complex scenario with mixed blob sharing', async () => {
      const directory = await prisma.directory.create({
        data: { path: '/test' }
      });

      const [snapshot1, snapshot2, snapshot3] = await prisma.snapshot.createManyAndReturn({
        data: [
          { directoryId: directory.id, number: 1 },
          { directoryId: directory.id, number: 2 },
          { directoryId: directory.id, number: 3 }
        ]
      });

      const blobs = await prisma.blob.createManyAndReturn({
        data: [
          { data: Buffer.from('unique1'), hash: 'unique1' },
          { data: Buffer.from('shared12'), hash: 'shared12' },
          { data: Buffer.from('shared13'), hash: 'shared13' },
          { data: Buffer.from('shared23'), hash: 'shared23' },
          { data: Buffer.from('unique2'), hash: 'unique2' }
        ]
      });

      // the query under test
      await prisma.object.createMany({
        data: [
          // blob[0]: only in snapshot1 ✓ (should be returned)
          { name: 'unique1.txt', snapshotId: snapshot1.id, blobId: blobs[0].id },
          // blob[1]: in snapshot1 and snapshot2 ✗ (should NOT be returned)
          { name: 'shared12_1.txt', snapshotId: snapshot1.id, blobId: blobs[1].id },
          { name: 'shared12_2.txt', snapshotId: snapshot2.id, blobId: blobs[1].id },
          // blob[2]: in snapshot1 and snapshot3 ✗ (should NOT be returned)
          { name: 'shared13_1.txt', snapshotId: snapshot1.id, blobId: blobs[2].id },
          { name: 'shared13_3.txt', snapshotId: snapshot3.id, blobId: blobs[2].id },
          // blob[3]: in snapshot2 and snapshot3, not in snapshot1 (should NOT be returned)
          { name: 'shared23_2.txt', snapshotId: snapshot2.id, blobId: blobs[3].id },
          { name: 'shared23_3.txt', snapshotId: snapshot3.id, blobId: blobs[3].id },
          // blob[4]: only in snapshot2 (should NOT be returned when querying snapshot1)
          { name: 'unique2.txt', snapshotId: snapshot2.id, blobId: blobs[4].id }
        ]
      });

      const result = await blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot1.id);

      expect(result).toHaveLength(1);
      // Only blob[0] is in snapshot 1 AND NOT in snapshot 2 or 3
      expect(result[0]).toBe(blobs[0].id);
    });
  });
});