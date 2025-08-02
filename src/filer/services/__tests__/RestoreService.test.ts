import { CreateService } from '../CreateService';
import { RestoreService } from '../RestoreService';
import { createTempDirectory, createTestDirectoryStructure, cleanupTempDirectory, assertDirectoryStructureEquals } from '../../../test/helpers';

describe('RestoreService', () => {
  let tempDir: string;
  let createService: CreateService;
  let restoreService: RestoreService;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    createService = new CreateService();
    restoreService = new RestoreService();
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

      const firstSnapshot = await createService.createSnapshot(tempDir);

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

      await createService.createSnapshot(tempDir);

      const restoreDir = tempDir + '_restore';
      const restorePath = await restoreService.restoreSnapshot(tempDir, firstSnapshot.number, restoreDir);

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
      const snapshot = await createService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'added_later.txt': 'this should not be in restore'
      });

      const restoreDir = tempDir + '_restore';
      const restorePath = await restoreService.restoreSnapshot(tempDir, snapshot.number, restoreDir);

      await assertDirectoryStructureEquals(
        restorePath,
        {}
      );
    });
  })
});