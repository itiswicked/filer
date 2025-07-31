import { SnapshotService } from './snapshot/SnapshotService';
import { ObjectService } from './object/ObjectService';

export class Filer {
  private static snapshotService = new SnapshotService();
  private static objectService = new ObjectService();

  static async createSnapshot(path: string) {
    const snapshot = await this.snapshotService.createSnapshot(path);
    const objects = await this.objectService.createObjectsFromDirectory(path, snapshot.id);
  }
}
