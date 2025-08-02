import { SnapshotRepository } from '../repositories/SnapshotRepository';
import { DirectoryRepository } from '../repositories/DirectoryRepository';
import { Filesystem, FileSystemEntry } from '../../lib/Filesystem';

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


    const fileSystemEntries: FileSystemEntry[] = snapshot.objects.map(obj => ({
      path: obj.name,
      content: obj.Blob?.data
    }));

    await Filesystem.write(fileSystemEntries, outputDirectory);

    return outputDirectory;
  }
}