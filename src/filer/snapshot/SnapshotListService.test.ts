import { SnapshotListService, SnapshotListItem } from './SnapshotListService';
import { SnapshotCreateService } from './SnapshotCreateService';
import { prisma } from '../../lib/prisma';
import { createTempDirectory, createTestDirectoryStructure, cleanupTempDirectory } from '../../test/helpers';

describe('SnapshotListService', () => {
  let tempDir: string;
  let snapshotListService: SnapshotListService;
  let snapshotCreateService: SnapshotCreateService;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    snapshotListService = new SnapshotListService();
    snapshotCreateService = new SnapshotCreateService();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('.listSnapshots', () => {
    it('returns empty array when no snapshots exist for directory', async () => {
      const result = await snapshotListService.listSnapshots('/nonexistent/path');

      expect(result).toEqual([]);
    });

    it('returns array with single snapshot', async () => {
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'hello'
      });

      await snapshotCreateService.createSnapshot(tempDir);

      const result = await snapshotListService.listSnapshots(tempDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        number: 1,
        date: expect.any(Date)
      });
    });

    it('returns array with multiple snapshots in ascending order', async () => {
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'hello'
      });
      await snapshotCreateService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'hello',
        'file2.txt': 'world'
      });
      await snapshotCreateService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'modified',
        'file2.txt': 'world'
      });
      await snapshotCreateService.createSnapshot(tempDir);

      const result = await snapshotListService.listSnapshots(tempDir);

      expect(result).toHaveLength(3);

      expect(result[0].number).toBe(1);
      expect(result[1].number).toBe(2);
      expect(result[2].number).toBe(3);

      for (const snapshot of result) {
        expect(snapshot.date).toBeInstanceOf(Date);
      }
    });

    it('handles different directory paths independently', async () => {
      const tempDir2 = await createTempDirectory('second-test-dir');

      try {
        expect(tempDir).not.toBe(tempDir2);

        await createTestDirectoryStructure(tempDir, {
          'file1.txt': 'hello'
        });
        await snapshotCreateService.createSnapshot(tempDir);

        await createTestDirectoryStructure(tempDir2, {
          'file2.txt': 'world'
        });
        await snapshotCreateService.createSnapshot(tempDir2);

        const result1 = await snapshotListService.listSnapshots(tempDir);
        expect(result1).toHaveLength(1);
        expect(result1[0].number).toBe(1);

        const result2 = await snapshotListService.listSnapshots(tempDir2);
        expect(result2).toHaveLength(1);
        expect(result2[0].number).toBe(1);
      } finally {
        await cleanupTempDirectory(tempDir2);
      }
    });
  });
});