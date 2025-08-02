import { SnapshotRepository } from '../SnapshotRepository';
import { DirectoryRepository } from '../DirectoryRepository';

describe('SnapshotRepository', () => {
  let snapshotRepository: SnapshotRepository;
  let directoryRepository: DirectoryRepository;
  let testDirectoryId: number;

  beforeEach(async () => {
    snapshotRepository = new SnapshotRepository();
    directoryRepository = new DirectoryRepository();

    // Create a test directory for our snapshots
    const directory = await directoryRepository.findOrCreate('/test/path');
    testDirectoryId = directory.id;
  });

  describe('.create', () => {
    it('creates snapshots with sequential numbers', async () => {
      const snapshot1 = await snapshotRepository.create(testDirectoryId);
      const snapshot2 = await snapshotRepository.create(testDirectoryId, snapshot1);
      const snapshot3 = await snapshotRepository.create(testDirectoryId, snapshot2);

      expect(snapshot1.number).toBe(1);
      expect(snapshot2.number).toBe(2);
      expect(snapshot3.number).toBe(3);
    });
  });
});