import { SnapshotService } from './SnapshotService';
import { prisma } from '../../lib/prisma';
import { createTempDirectory, createTestDirectoryStructure, cleanupTempDirectory, assertDirectoryStructureEquals } from '../../test/helpers';

describe('SnapshotService', () => {
  let tempDir: string;
  let snapshotService: SnapshotService;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    snapshotService = new SnapshotService();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('.createSnapshot', () => {
    it('inserts correct number of directories, snapshots, objects, and blobs', async () => {
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'hello'
      });

      await snapshotService.createSnapshot(tempDir);

      const dirCount = await prisma.directory.count();
      const snapshotCount = await prisma.snapshot.count();
      const objectCount = await prisma.object.count();
      const blobCount = await prisma.blob.count();

      expect(dirCount).toBe(1);
      expect(snapshotCount).toBe(1);
      // 1 object: 1 file
      expect(objectCount).toBe(1);
      // 1 blob: only for the file
      expect(blobCount).toBe(1);
    });

    it('does not duplicate blobs for unchanged files', async () => {
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'original content',
        'file2.txt': 'original content'
      });

      await snapshotService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'MODIFIED content',  // Changed
        'file2.txt': 'original content'
      });

      await snapshotService.createSnapshot(tempDir);

      const dirCount = await prisma.directory.count();
      const snapshotCount = await prisma.snapshot.count();
      const objectCount = await prisma.object.count();
      const blobCount = await prisma.blob.count();

      expect(dirCount).toBe(1);
      expect(snapshotCount).toBe(2);
      expect(objectCount).toBe(4);
      expect(blobCount).toBe(3);

      // Verify that objects in second snapshot reference different blobs
      const snapshots = await prisma.snapshot.findMany({ orderBy: { id: 'asc' } });
      const firstSnapshotObjects = await prisma.object.findMany({
        where: { snapshotId: snapshots[0].id },
        include: { Blob: true }
      });
      const secondSnapshotObjects = await prisma.object.findMany({
        where: { snapshotId: snapshots[1].id },
        include: { Blob: true }
      });

      const firstFile1 = firstSnapshotObjects.find(obj => obj.name === 'file1.txt');
      const secondFile1 = secondSnapshotObjects.find(obj => obj.name === 'file1.txt');

      // Modified file should have different blob IDs (different content)
      expect(firstFile1?.blobId).not.toBe(secondFile1?.blobId);

      const firstFile2 = firstSnapshotObjects.find(obj => obj.name === 'file2.txt');
      const secondFile2 = secondSnapshotObjects.find(obj => obj.name === 'file2.txt');

      // Unchanged file should have same blob ID (same content, deduplicated)
      expect(firstFile2?.blobId).toBe(secondFile2?.blobId);
    });

    it('saves one less object when a file is deleted', async () => {

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'original content',
        'file2.txt': 'original content'
      });

      await snapshotService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file2.txt': 'original content',
      });

      await snapshotService.createSnapshot(tempDir);

      const objectCount = await prisma.object.count();
      const blobCount = await prisma.blob.count();

      expect(objectCount).toBe(3);
      expect(blobCount).toBe(2);
    });

    it('creates snapshots with sequential numbers', async () => {
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'content'
      });

      const snapshot1 = await snapshotService.createSnapshot(tempDir);
      const snapshot2 = await snapshotService.createSnapshot(tempDir);

      expect(snapshot1.number).toBe(1);
      expect(snapshot2.number).toBe(2);
    });
  })

  describe('.restoreSnapshot', () => {
    it('restores the directory state with bit-for-bit identical files', async () => {
      // Setup: Create initial directory structure with various file types to test bit-for-bit restoration
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]).toString('utf8');

      const originalStructure = {
        'file1.txt': 'original content 1',
        'binary.txt': binaryContent,
        'unicode.txt': 'Testing unicode: 🚀 ñáéíóú',
        'large.txt': 'x'.repeat(10000),
        'subdir': {
          'nested.txt': 'nested content',
          'deep': {
            'deepfile.txt': 'deep content'
          }
        }
      };

      await createTestDirectoryStructure(tempDir, originalStructure);

      const firstSnapshot = await snapshotService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'MODIFIED content 1',  // Changed file
        'binary.txt': 'modified binary',    // Changed binary file
        'unicode.txt': 'modified unicode',  // Changed unicode file
        'large.txt': 'short',               // Changed large file
        'file3.txt': 'new file content',    // New file
        'subdir': {
          'nested.txt': 'MODIFIED nested content',  // Changed nested file
          'newfile.txt': 'another new file'         // New nested file
          // Note: deep directory is deleted
        }
      });

      await snapshotService.createSnapshot(tempDir);

      const restoreDir = await createTempDirectory();

      await snapshotService.restoreSnapshot(firstSnapshot.id, restoreDir);

      // Assert: The restored directory should match the original structure exactly
      await assertDirectoryStructureEquals(
        restoreDir,
        originalStructure
      );

      // Additional assertion: Ensure the original directory still has the modified state
      const currentStructure = {
        'file1.txt': 'MODIFIED content 1',
        'binary.txt': 'modified binary',
        'unicode.txt': 'modified unicode',
        'large.txt': 'short',
        'file3.txt': 'new file content',
        'subdir': {
          'nested.txt': 'MODIFIED nested content',
          'newfile.txt': 'another new file'
        }
      };

      await assertDirectoryStructureEquals(
        tempDir,
        currentStructure
      );
    });

    it('restores empty directory snapshot correctly', async () => {
      // Setup: Create empty directory snapshot
      await createTestDirectoryStructure(tempDir, {});
      const snapshot = await snapshotService.createSnapshot(tempDir);

      // Add files after snapshot
      await createTestDirectoryStructure(tempDir, {
        'added_later.txt': 'this should not be in restore'
      });

      // Create restore directory
      const restoreDir = await createTempDirectory();

      // Act: Restore empty snapshot
      await snapshotService.restoreSnapshot(snapshot.id, restoreDir);

      // Assert: Restored directory should be empty
      await assertDirectoryStructureEquals(
        restoreDir,
        {}
      );
    });
  })
});