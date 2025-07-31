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
    // Setup: 1 file
    await createTestDirectoryStructure(tempDir, {
      'file1.txt': 'hello'
    });

    // Act
    await snapshotService.createSnapshot(tempDir);

    // Assert
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
    // Setup: Create initial directory structure
    await createTestDirectoryStructure(tempDir, {
      'file1.txt': 'original content',
      'file2.txt': 'original content'
    });

    // Act: Create first snapshot
    await snapshotService.createSnapshot(tempDir);

    // Modify the file
    await createTestDirectoryStructure(tempDir, {
      'file1.txt': 'MODIFIED content',  // Changed
      'file2.txt': 'original content'
    });

    await snapshotService.createSnapshot(tempDir);

    const dirCount = await prisma.directory.count();
    const snapshotCount = await prisma.snapshot.count();
    const objectCount = await prisma.object.count();
    const blobCount = await prisma.blob.count();

    // 1 directory (same directory for both snapshots)
    expect(dirCount).toBe(1);
    // 2 snapshots (original + new)
    expect(snapshotCount).toBe(2);
    // 2 objects: 1 file per snapshot × 2 snapshots
    expect(objectCount).toBe(4);
    // 2 blobs: 1 from first snapshot + 1 new blob for modified file
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

    // Find the modified file object in both snapshots
    const firstFile1 = firstSnapshotObjects.find(obj => obj.name === 'file1.txt');
    const secondFile1 = secondSnapshotObjects.find(obj => obj.name === 'file1.txt');

    // Modified file should have different blob IDs (different content)
    expect(firstFile1?.blobId).not.toBe(secondFile1?.blobId);

    // Find the unchanged file object in both snapshots
    const firstFile2 = firstSnapshotObjects.find(obj => obj.name === 'file2.txt');
    const secondFile2 = secondSnapshotObjects.find(obj => obj.name === 'file2.txt');

    // Unchanged file should have same blob ID (same content, deduplicated)
    expect(firstFile2?.blobId).toBe(secondFile2?.blobId);
  });

  it('saves one less object when a file is deleted', async () => {
    // Setup: Create initial directory structure
    await createTestDirectoryStructure(tempDir, {
      'file1.txt': 'original content',
      'file2.txt': 'original content'
    });

    // Act: Create first snapshot
    await snapshotService.createSnapshot(tempDir);

    // Delete a file (by only specifying the remaining file)
    await createTestDirectoryStructure(tempDir, {
      'file2.txt': 'original content',
    });

    await snapshotService.createSnapshot(tempDir);

    const objectCount = await prisma.object.count();
    const blobCount = await prisma.blob.count();

    expect(objectCount).toBe(3);
    expect(blobCount).toBe(2);
  });
  })

  describe('.restoreSnapshot', () => {
    it('restores the directory state from a previous snapshot', async () => {
      // Setup: Create initial directory structure with multiple files and subdirectories
      const originalStructure = {
        'file1.txt': 'original content 1',
        'file2.txt': 'original content 2',
        'subdir': {
          'nested.txt': 'nested content',
          'deep': {
            'deepfile.txt': 'deep content'
          }
        }
      };

      await createTestDirectoryStructure(tempDir, originalStructure);

      // Act: Create first snapshot
      const firstSnapshot = await snapshotService.createSnapshot(tempDir);

      // Modify the directory structure significantly
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'MODIFIED content 1',  // Changed file
        'file3.txt': 'new file content',    // New file
        'subdir': {
          'nested.txt': 'MODIFIED nested content',  // Changed nested file
          'newfile.txt': 'another new file'         // New nested file
          // Note: deep directory and file2.txt are deleted
        }
      });

      // Create second snapshot (to ensure we're not just restoring the current state)
      await snapshotService.createSnapshot(tempDir);

      // Create a new directory for restoration
      const restoreDir = await createTempDirectory();

      try {
        // Act: Restore the first snapshot
        await snapshotService.restoreSnapshot(firstSnapshot.id, restoreDir);

        // Assert: The restored directory should match the original structure exactly
        await assertDirectoryStructureEquals(
          restoreDir,
          originalStructure,
          "Restored snapshot does not match original structure"
        );

        // Additional assertion: Ensure the original directory still has the modified state
        const currentStructure = {
          'file1.txt': 'MODIFIED content 1',
          'file3.txt': 'new file content',
          'subdir': {
            'nested.txt': 'MODIFIED nested content',
            'newfile.txt': 'another new file'
          }
        };

        await assertDirectoryStructureEquals(
          tempDir,
          currentStructure,
          "Original directory was unexpectedly modified during restore"
        );

      } finally {
        // Cleanup restore directory
        await cleanupTempDirectory(restoreDir);
      }
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

      try {
        // Act: Restore empty snapshot
        await snapshotService.restoreSnapshot(snapshot.id, restoreDir);

        // Assert: Restored directory should be empty
        await assertDirectoryStructureEquals(
          restoreDir,
          {},
          "Restored empty snapshot should result in empty directory"
        );

      } finally {
        await cleanupTempDirectory(restoreDir);
      }
    });

    it('restores files bit-for-bit identical to original', async () => {
      // Setup: Create files with binary content to test bit-for-bit restoration
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]).toString('utf8');

      await createTestDirectoryStructure(tempDir, {
        'binary.txt': binaryContent,
        'unicode.txt': 'Testing unicode: 🚀 ñáéíóú',
        'large.txt': 'x'.repeat(10000) // Large file
      });

      const snapshot = await snapshotService.createSnapshot(tempDir);

      // Modify files
      await createTestDirectoryStructure(tempDir, {
        'binary.txt': 'modified content',
        'unicode.txt': 'modified unicode',
        'large.txt': 'short'
      });

      const restoreDir = await createTempDirectory();

      try {
        // Act: Restore snapshot
        await snapshotService.restoreSnapshot(snapshot.id, restoreDir);

        // Assert: Files should be bit-for-bit identical
        await assertDirectoryStructureEquals(
          restoreDir,
          {
            'binary.txt': binaryContent,
            'unicode.txt': 'Testing unicode: 🚀 ñáéíóú',
            'large.txt': 'x'.repeat(10000)
          },
          "Restored files are not bit-for-bit identical"
        );

      } finally {
        await cleanupTempDirectory(restoreDir);
      }
    });
  })
});