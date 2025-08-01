import { SnapshotCreateService } from './snapshot/SnapshotCreateService';
import { SnapshotRestoreService } from './snapshot/SnapshotRestoreService';

export class Filer {
  private static snapshotCreateService = new SnapshotCreateService();
  private static snapshotRestoreService = new SnapshotRestoreService();

  static async createSnapshot(path: string) {
    return await this.snapshotCreateService.createSnapshot(path);
  }

  static async restoreSnapshot(snapshotId: number, directoryPath: string) {
    return await this.snapshotRestoreService.restoreSnapshot(snapshotId, directoryPath);
  }
}
