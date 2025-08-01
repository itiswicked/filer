import { SnapshotCreateService } from './SnapshotCreateService';
import { SnapshotPruneService } from './SnapshotPruneService';
import { prisma } from '../../lib/prisma';
import { createTempDirectory, createTestDirectoryStructure, cleanupTempDirectory } from '../../test/helpers';

describe('SnapshotPruneService', () => {
  let tempDir: string;
  let snapshotCreateService: SnapshotCreateService;
  let snapshotPruneService: SnapshotPruneService;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    snapshotCreateService = new SnapshotCreateService();
    snapshotPruneService = new SnapshotPruneService();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('.pruneSnapshot', () => {
    it('should raise an error when trying to prune from a non-existent directory', async () => {
      await expect(
        snapshotPruneService.pruneSnapshot('/path/that/does/not/exist', 1)
      ).rejects.toThrow('Directory not found: /path/that/does/not/exist');
    });

    it('should raise an error when trying to prune a non-existent snapshot', async () => {
      // Create directory entry by creating a snapshot first
      await createTestDirectoryStructure(tempDir, { 'file.txt': 'content' });
      await snapshotCreateService.createSnapshot(tempDir);

      // Now try to prune a non-existent snapshot number
      await expect(
        snapshotPruneService.pruneSnapshot(tempDir, 999)
      ).rejects.toThrow('Snapshot with number 999 not found');
    });
    it('should delete the specified snapshot when it exists', async () => {
      // TODO: Implement test
      // - Create multiple snapshots (e.g., 3)
      // - Prune a specific snapshot number (e.g., snapshot 2)
      // - Verify the specific snapshot was deleted
      // - Verify other snapshots remain untouched
    });




    it('does not delete blobs that are referenced by other snapshots', async () => {
      // TODO: Implement test
      // - Create multiple snapshots (e.g., 3), where a file does not change
      // - Prune a specific snapshot number (e.g., snapshot 2)
      // - Verify the specific snapshot was deleted
      // - Verify other snapshots remain untouched
      // - i.e. the file that does not change, it's blob should still exist, and other the other two snapshots should reference it.
    });

  });
});