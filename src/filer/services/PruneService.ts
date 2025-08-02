import { SnapshotRepository } from '../repositories/SnapshotRepository';
import { DirectoryRepository } from '../repositories/DirectoryRepository';
import { BlobRepository } from '../repositories/BlobRepository';

export class PruneService {
  private snapshotRepository = new SnapshotRepository();
  private directoryRepository = new DirectoryRepository();
  private blobRepository = new BlobRepository();

  async pruneSnapshot(path: string, snapshotNumber: number): Promise<boolean> {
    const directory = await this.directoryRepository.findByPath(path);
    if (!directory) {
      throw new Error(`Directory not found: ${path}`);
    }

    const snapshot = await this.snapshotRepository.findByDirectoryAndNumber(
      directory.id,
      snapshotNumber
    );
    if (!snapshot) {
      throw new Error(`Snapshot with number ${snapshotNumber} not found`);
    }

    // Get blobs that are safe to delete (only referenced by this snapshot)
    const safeToDeleteBlobs = await this.blobRepository.findBlobsReferencedOnlyBySnapshot(snapshot.id);

    await this.snapshotRepository.delete(snapshot.id);

    await this.blobRepository.deleteMany(safeToDeleteBlobs);

    return true;
  }
}