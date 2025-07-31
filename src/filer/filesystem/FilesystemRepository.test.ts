import { FilesystemRepository } from './FilesystemRepository';
import {
  createTempDirectory,
  createTestDirectoryStructure,
  cleanupTempDirectory
} from '../../test/helpers';

describe('FilesystemRepository', () => {
  let tempDir: string;
  let filesystemRepository: FilesystemRepository;

  beforeEach(async () => {
    filesystemRepository = new FilesystemRepository();
    tempDir = await createTempDirectory();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('entries', () => {
    it('should scan a simple directory with files', async () => {
      // Create test directory structure
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'Hello World',
        'file2.js': 'console.log("test");',
        'README.md': '# Test Project'
      });

      // Scan the directory
      const entries = await filesystemRepository.entries(tempDir);

      // Assert correct number of entries
      expect(entries.length).toBe(3);

      // Assert file entries
      const file1 = entries.find(entry => entry.path === 'file1.txt');
      expect(file1).toBeDefined();
      expect(file1?.content).toBeInstanceOf(Buffer);
      expect(file1?.content?.toString()).toBe('Hello World');

      const file2 = entries.find(entry => entry.path === 'file2.js');
      expect(file2).toBeDefined();
      expect(file2?.content).toBeInstanceOf(Buffer);
      expect(file2?.content?.toString()).toBe('console.log("test");');

      const readme = entries.find(entry => entry.path === 'README.md');
      expect(readme).toBeDefined();
      expect(readme?.content).toBeInstanceOf(Buffer);
      expect(readme?.content?.toString()).toBe('# Test Project');
    });

    it('should scan nested directory structure', async () => {
      // Create nested directory structure
      await createTestDirectoryStructure(tempDir, {
        'root.txt': 'root file',
        'src': {
          'index.js': 'main entry point',
          'utils': {
            'helper.js': 'helper function'
          }
        },
        'docs': {
          'api.md': '# API Documentation'
        }
      });

      // Scan the directory
      const entries = await filesystemRepository.entries(tempDir);

      // Assert correct number of entries (4 files + 3 directories)
      expect(entries.length).toBe(7);

      // Assert root file
      const rootFile = entries.find(entry => entry.path === 'root.txt');
      expect(rootFile).toBeDefined();
      expect(rootFile?.content).toBeInstanceOf(Buffer);
      expect(rootFile?.content?.toString()).toBe('root file');

      // Assert directories (no content = directory)
      const srcDir = entries.find(entry => entry.path === 'src/');
      expect(srcDir).toBeDefined();
      expect(srcDir?.content).toBeUndefined();

      const utilsDir = entries.find(entry => entry.path === 'src/utils/');
      expect(utilsDir).toBeDefined();
      expect(utilsDir?.content).toBeUndefined();

      const docsDir = entries.find(entry => entry.path === 'docs/');
      expect(docsDir).toBeDefined();
      expect(docsDir?.content).toBeUndefined();

      // Assert nested files (have content = file)
      const indexFile = entries.find(entry => entry.path === 'src/index.js');
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toBeInstanceOf(Buffer);
      expect(indexFile?.content?.toString()).toBe('main entry point');

      const helperFile = entries.find(entry => entry.path === 'src/utils/helper.js');
      expect(helperFile).toBeDefined();
      expect(helperFile?.content).toBeInstanceOf(Buffer);
      expect(helperFile?.content?.toString()).toBe('helper function');

      const apiFile = entries.find(entry => entry.path === 'docs/api.md');
      expect(apiFile).toBeDefined();
      expect(apiFile?.content).toBeInstanceOf(Buffer);
      expect(apiFile?.content?.toString()).toBe('# API Documentation');
    });

    it('should handle empty directory', async () => {
      const entries = await filesystemRepository.entries(tempDir);

      expect(entries.length).toBe(0);
    });

    it('should handle binary files', async () => {
      // Create a directory with binary content
      await createTestDirectoryStructure(tempDir, {
        'text.txt': 'regular text',
        'binary.dat': Buffer.from([0x00, 0x01, 0xFF, 0xFE]).toString()
      });

      const entries = await filesystemRepository.entries(tempDir);

      expect(entries.length).toBe(2);

      const textFile = entries.find(entry => entry.path === 'text.txt');
      expect(textFile?.content).toBeInstanceOf(Buffer);
      expect(textFile?.content?.toString()).toBe('regular text');

      const binaryFile = entries.find(entry => entry.path === 'binary.dat');
      expect(binaryFile?.content).toBeInstanceOf(Buffer);
      expect(binaryFile?.content?.toString()).toBe(Buffer.from([0x00, 0x01, 0xFF, 0xFE]).toString());
    });

    it('should use relative paths from root directory', async () => {
      await createTestDirectoryStructure(tempDir, {
        'level1': {
          'level2': {
            'deep.txt': 'deep file'
          }
        }
      });

      const entries = await filesystemRepository.entries(tempDir);

      // Find the deep file
      const deepFile = entries.find(entry => entry.path === 'level1/level2/deep.txt');
      expect(deepFile).toBeDefined();
      expect(deepFile?.content).toBeInstanceOf(Buffer);
      expect(deepFile?.content?.toString()).toBe('deep file');

      // Verify all paths are relative
      entries.forEach(entry => {
        expect(entry.path.startsWith('/')).toBe(false);
        expect(entry.path.includes(tempDir)).toBe(false);
      });
    });
  });
});