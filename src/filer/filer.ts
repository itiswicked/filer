import { CreateService } from './services/CreateService';
import { RestoreService } from './services/RestoreService';
import { PruneService } from './services/PruneService';
import { ListService } from './services/ListService';

export class Filer {
  private static createService = new CreateService();
  private static restoreService = new RestoreService();
  private static pruneService = new PruneService();
  private static listService = new ListService();

  static async createSnapshot(path: string) {
    return await this.createService.createSnapshot(path);
  }

  static async restoreSnapshot(directoryPath: string, snapshotNumber: number, outputDirectory: string) {
    return await this.restoreService.restoreSnapshot(directoryPath, snapshotNumber, outputDirectory);
  }

  static async pruneSnapshot(path: string, snapshotNumber: number) {
    return await this.pruneService.pruneSnapshot(path, snapshotNumber);
  }

  static async listSnapshots(directoryPath: string) {
    return await this.listService.listSnapshots(directoryPath);
  }
}
