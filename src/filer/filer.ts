import { SnapshotCreateService } from './snapshot/SnapshotCreateService';
import { SnapshotRestoreService } from './snapshot/SnapshotRestoreService';
import { SnapshotPruneService } from './snapshot/SnapshotPruneService';

export class Filer {
  private static snapshotCreateService = new SnapshotCreateService();
  private static snapshotRestoreService = new SnapshotRestoreService();
  private static snapshotPruneService = new SnapshotPruneService();

  static async createSnapshot(path: string) {
    return await this.snapshotCreateService.createSnapshot(path);
  }

  static async restoreSnapshot(snapshotId: number, directoryPath: string) {
    return await this.snapshotRestoreService.restoreSnapshot(snapshotId, directoryPath);
  }

  static async pruneSnapshot(path: string, snapshotNumber: number) {
    return await this.snapshotPruneService.pruneSnapshot(path, snapshotNumber);
  }
}
