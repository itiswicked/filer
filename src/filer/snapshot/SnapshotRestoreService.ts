import { SnapshotRepository } from './SnapshotRepository';
import { DirectoryRepository } from '../directory/DirectoryRepository';
import { Filesystem, FileSystemEntry } from '../filesystem/Filesystem';

export class SnapshotRestoreService {
  private snapshotRepository = new SnapshotRepository();
  private directoryRepository = new DirectoryRepository();

  async restoreSnapshot(snapshotId: number, directoryPath: string): Promise<string> {
    const directory = await this.directoryRepository.findByPath(directoryPath);

    if (!directory) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }

    const snapshot = await this.snapshotRepository.findByIdWithObjectsAndBlobs(snapshotId);

    if (!snapshot) {
      throw new Error(`Snapshot with id ${snapshotId} not found`);
    }

    const snapshotDate = snapshot.createdAt.toISOString().replace(/[:\s]/g, '_');
    const restorePath = `${directoryPath}_${snapshotDate}`;

    const fileSystemEntries: FileSystemEntry[] = snapshot.objects.map(obj => ({
      path: obj.name,
      content: obj.Blob?.data
    }));

    await Filesystem.write(fileSystemEntries, restorePath);

    return restorePath;
  }
}