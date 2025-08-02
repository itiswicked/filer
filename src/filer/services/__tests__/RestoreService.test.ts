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
    it('restores the directory state with identical files', async () => {
      const fs = require('fs');
      const path = require('path');

      // Read the test PNG file for real image content
      const pngPath = path.join(__dirname, '../../../test/testimg.png');
      const pngBuffer = fs.readFileSync(pngPath);
      const imageContent = pngBuffer.toString('utf8');

      const originalStructure = {
        'file1.txt': 'original content 1',
        'image.png': imageContent,
        'unicode.txt': 'unicode: 🚀 ñáéíóú',
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
        'image.png': imageContent, // Keep image unchanged to test restoration
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

      await assertDirectoryStructureEquals(
        tempDir,
        {
          'file1.txt': 'MODIFIED content 1',
          'image.png': imageContent,
          'unicode.txt': 'modified unicode',
          'large.txt': 'short',
          'file3.txt': 'new file content',
          'subdir': {
            'nested.txt': 'MODIFIED nested content',
            'newfile.txt': 'another new file'
          }
        }
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