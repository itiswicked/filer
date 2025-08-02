import { SnapshotCreateService } from './SnapshotCreateService';
import { SnapshotRestoreService } from './SnapshotRestoreService';
import { createTempDirectory, createTestDirectoryStructure, cleanupTempDirectory, assertDirectoryStructureEquals } from '../../test/helpers';

describe('SnapshotRestoreService', () => {
  let tempDir: string;
  let snapshotCreateService: SnapshotCreateService;
  let snapshotRestoreService: SnapshotRestoreService;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    snapshotCreateService = new SnapshotCreateService();
    snapshotRestoreService = new SnapshotRestoreService();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('.restoreSnapshot', () => {
    it('restores the directory state with bit-for-bit identical files', async () => {
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

      const firstSnapshot = await snapshotCreateService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'MODIFIED content 1',
        'binary.txt': 'modified binary',
        'unicode.txt': 'modified unicode',
        'large.txt': 'short',
        'file3.txt': 'new file content',
        'subdir': {
          'nested.txt': 'MODIFIED nested content',
          'newfile.txt': 'another new file'
        }
      });

      await snapshotCreateService.createSnapshot(tempDir);

      const restoreDir = tempDir + '_restore';
      const restorePath = await snapshotRestoreService.restoreSnapshot(tempDir, firstSnapshot.number, restoreDir);

      await assertDirectoryStructureEquals(
        restorePath,
        originalStructure
      );

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
      await createTestDirectoryStructure(tempDir, {});
      const snapshot = await snapshotCreateService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'added_later.txt': 'this should not be in restore'
      });

      const restoreDir = tempDir + '_restore';
      const restorePath = await snapshotRestoreService.restoreSnapshot(tempDir, snapshot.number, restoreDir);

      await assertDirectoryStructureEquals(
        restorePath,
        {}
      );
    });
  })
});