import { CreateService } from '../CreateService';
import { prisma } from '../../../lib/prisma';
import { createTempDirectory, createTestDirectoryStructure, cleanupTempDirectory, assertDirectoryStructureEquals } from '../../../test/helpers';

describe('CreateService', () => {
  let tempDir: string;
  let createService: CreateService;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    createService = new CreateService();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('.createSnapshot', () => {
    it('inserts correct number of directories, snapshots, objects, and blobs', async () => {
      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'hello'
      });

      await createService.createSnapshot(tempDir);

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

      await createService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'MODIFIED content',  // Changed
        'file2.txt': 'original content'
      });

      await createService.createSnapshot(tempDir);

      const dirCount = await prisma.directory.count();
      const snapshotCount = await prisma.snapshot.count();
      const objectCount = await prisma.object.count();
      const blobCount = await prisma.blob.count();

      expect(dirCount).toBe(1);
      expect(snapshotCount).toBe(2);
      expect(objectCount).toBe(4);
      expect(blobCount).toBe(2); // Only 2 blobs: 'original content' and 'MODIFIED content'

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
        'file2.txt': 'original content',
        'file3.txt': 'other content'
      });

      await createService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'file1.txt': 'original content',
        'file2.txt': 'original content'
      });

      await createService.createSnapshot(tempDir);

      const objectCount = await prisma.object.count();
      const blobCount = await prisma.blob.count();

      expect(objectCount).toBe(5);
      expect(blobCount).toBe(2);
    });

    it('deduplicates blobs when files have identical content in same snapshot', async () => {
      await createTestDirectoryStructure(tempDir, {
        'original.txt': 'same content',
        'copy.txt': 'same content',
        'backup.txt': 'same content',
        'different.txt': 'different content'
      });

      await createService.createSnapshot(tempDir);

      const blobCount = await prisma.blob.count();
      const objectCount = await prisma.object.count();

      expect(blobCount).toBe(2);     // Only two blobs for the two different contents
      expect(objectCount).toBe(4);   // But four separate objects (one per file)

      // Verify the three files with same content reference the same blob
      const objects = await prisma.object.findMany({
        where: { name: { in: ['original.txt', 'copy.txt', 'backup.txt'] } },
        include: { Blob: true }
      });

      const blobIds = objects.map(obj => obj.blobId);
      expect(new Set(blobIds).size).toBe(1); // All three should have same blob ID
    });

    it('handles nested directories and empty directories', async () => {
      await createTestDirectoryStructure(tempDir, {
        'folder1': {
          'subfolder': {
            'file.txt': 'content'
          }
        },
        'folder2': {
          'another': {}
        },
        'rootfile.txt': 'root content'
      });

      await createService.createSnapshot(tempDir);

      const objects = await prisma.object.findMany();
      const directories = objects.filter(obj => obj.blobId === null);
      const files = objects.filter(obj => obj.blobId !== null);

      expect(directories).toHaveLength(4); // folder1/, folder1/subfolder/, folder2/, folder2/another/
      expect(files).toHaveLength(2);       // file.txt, rootfile.txt

      // Verify directory paths are stored correctly
      const directoryPaths = directories.map(dir => dir.name).sort();
      expect(directoryPaths).toEqual([
        'folder1/',
        'folder1/subfolder/',
        'folder2/',
        'folder2/another/'
      ]);
    });

    it('reuses blobs even when files are restored many snapshots later', async () => {
      await createTestDirectoryStructure(tempDir, {
        'important.txt': 'critical data'
      });
      await createService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {});
      await createService.createSnapshot(tempDir);

      // Snapshot 3: Still no file
      await createTestDirectoryStructure(tempDir, {
        'other.txt': 'unrelated content'
      });
      await createService.createSnapshot(tempDir);

      await createTestDirectoryStructure(tempDir, {
        'important.txt': 'critical data', // Same content as Snapshot 1
        'other.txt': 'unrelated content'
      });
      await createService.createSnapshot(tempDir);

      const blobCount = await prisma.blob.count();
      expect(blobCount).toBe(2); // Only 2 blobs total: 'critical data' + 'unrelated content'

      // Verify the restored file references the same blob as the original
      const snapshots = await prisma.snapshot.findMany({ orderBy: { id: 'asc' } });
      const firstSnapshotObjects = await prisma.object.findMany({
        where: { snapshotId: snapshots[0].id, name: 'important.txt' }
      });
      const lastSnapshotObjects = await prisma.object.findMany({
        where: { snapshotId: snapshots[3].id, name: 'important.txt' }
      });

      expect(firstSnapshotObjects[0].blobId).toBe(lastSnapshotObjects[0].blobId);
    });

    it('reuses blobs when files are deleted and restored in consecutive snapshots', async () => {
      await createTestDirectoryStructure(tempDir, {
        'text1.txt': 'content1',
        'text2.txt': 'content2'
      });
      await createService.createSnapshot(tempDir);

      // text1.txt deleted, text2.txt remains
      await createTestDirectoryStructure(tempDir, {
        'text2.txt': 'content2'
      });
      await createService.createSnapshot(tempDir);

      // text1.txt restored, text2.txt remains
      await createTestDirectoryStructure(tempDir, {
        'text1.txt': 'content1', // Same content as Snapshot 1
        'text2.txt': 'content2'
      });
      await createService.createSnapshot(tempDir);

      const blobCount = await prisma.blob.count();
      expect(blobCount).toBe(2); // Only 2 blobs total: 'content1' + 'content2'

      // Verify text1.txt in snapshot 1 and snapshot 3 reference the same blob
      const snapshots = await prisma.snapshot.findMany({ orderBy: { id: 'asc' } });

      const snap1Text1 = await prisma.object.findFirst({
        where: { snapshotId: snapshots[0].id, name: 'text1.txt' }
      });
      const snap3Text1 = await prisma.object.findFirst({
        where: { snapshotId: snapshots[2].id, name: 'text1.txt' }
      });

      expect(snap1Text1?.blobId).toBe(snap3Text1?.blobId);

      // Verify text2.txt is consistent across all snapshots where it exists
      const snap1Text2 = await prisma.object.findFirst({
        where: { snapshotId: snapshots[0].id, name: 'text2.txt' }
      });
      const snap2Text2 = await prisma.object.findFirst({
        where: { snapshotId: snapshots[1].id, name: 'text2.txt' }
      });
      const snap3Text2 = await prisma.object.findFirst({
        where: { snapshotId: snapshots[2].id, name: 'text2.txt' }
      });

      expect(snap1Text2?.blobId).toBe(snap2Text2?.blobId);
      expect(snap2Text2?.blobId).toBe(snap3Text2?.blobId);
    });

    it('handles binary files correctly (PNG test)', async () => {
      const fs = require('fs');
      const path = require('path');

      // Read the test PNG file
      const pngPath = path.join(__dirname, '../../../test/testimg.png');
      const pngBuffer = fs.readFileSync(pngPath);

      // Copy the PNG into our test directory
      const testPngPath = path.join(tempDir, 'test_image.png');
      fs.writeFileSync(testPngPath, pngBuffer);

      await createService.createSnapshot(tempDir);

      const objectCount = await prisma.object.count();
      expect(objectCount).toBe(1); // One PNG file

      // Verify the PNG file was stored correctly
      const pngObject = await prisma.object.findFirst({
        where: { name: 'test_image.png' },
        include: { Blob: true }
      });

      expect(pngObject).toBeTruthy();
      expect(pngObject?.Blob?.data).toEqual(pngBuffer); // Binary data preserved exactly
    });
  })
});