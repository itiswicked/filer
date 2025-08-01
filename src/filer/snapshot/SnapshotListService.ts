import { SnapshotRepository } from './SnapshotRepository';

export interface SnapshotListItem {
  number: number;
  date: Date;
}

export class SnapshotListService {
  private snapshotRepository = new SnapshotRepository();

    async listSnapshots(directoryPath: string): Promise<SnapshotListItem[]> {
    const snapshots = await this.snapshotRepository.findAllByDirectoryPath(directoryPath);

    return snapshots.map(snapshot => ({
      number: snapshot.number,
      date: snapshot.createdAt
    }));
  }
}