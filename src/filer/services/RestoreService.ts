import { SnapshotRepository } from '../snapshot/SnapshotRepository';
import { DirectoryRepository } from '../directory/DirectoryRepository';
import { Filesystem, FileSystemEntry } from '../filesystem/Filesystem';

export class RestoreService {
  private snapshotRepository = new SnapshotRepository();
  private directoryRepository = new DirectoryRepository();

  async restoreSnapshot(directoryPath: string, snapshotNumber: number, outputDirectory: string): Promise<string> {
    const directory = await this.directoryRepository.findByPath(directoryPath);
    if (!directory) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }

    const snapshot = await this.snapshotRepository.findByDirectoryAndNumberWithObjectsAndBlobs(
      directory.id,
      snapshotNumber
    );
    if (!snapshot) {
      throw new Error(`Snapshot with number ${snapshotNumber} not found for directory: ${directoryPath}`);
    }

    const snapshotDate = snapshot.createdAt.toISOString().replace(/[:\s]/g, '_');

    const fileSystemEntries: FileSystemEntry[] = snapshot.objects.map(obj => ({
      path: obj.name,
      content: obj.Blob?.data
    }));

    await Filesystem.write(fileSystemEntries, outputDirectory);

    return outputDirectory;
  }
}