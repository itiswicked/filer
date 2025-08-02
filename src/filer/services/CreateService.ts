import { SnapshotRepository } from '../snapshot/SnapshotRepository';
import { DirectoryRepository } from '../directory/DirectoryRepository';
import { BlobRepository } from '../blob/BlobRepository';
import { Snapshot } from '@prisma/client';
import { Filesystem } from '../filesystem/Filesystem';
import { ObjectRepository } from '../object/ObjectRepository';
import { Prisma, Blob as PrismaBlob } from '@prisma/client';
import { hashifyContent } from '../../lib/cryptoHelper';
import { objectFromEntries } from '../../lib/generic';


export class CreateService {
  private snapshotRepository = new SnapshotRepository();
  private directoryRepository = new DirectoryRepository();
  private objectRepository = new ObjectRepository();
  private blobRepository = new BlobRepository();

  async createSnapshot(path: string): Promise<Snapshot> {
    const fileSystemObjects = await Filesystem.read(path);
    const files = fileSystemObjects.filter(obj => obj.content !== undefined);
    const directories = fileSystemObjects.filter(obj => obj.content === undefined);

    const directory = await this.directoryRepository.findOrCreate(path);
    const previousSnapshot = await this.snapshotRepository.findLatestByDirectory(directory.id);
    const snapshot = await this.snapshotRepository.create(directory.id, previousSnapshot);

    // Get all blobs from the previous snapshot
    let previousBlobMap: Record<string, PrismaBlob> = {};
    if (previousSnapshot) {
      const previousBlobs = await this.blobRepository.blobsForSnapshot(previousSnapshot.id);
      previousBlobMap = objectFromEntries('hash', previousBlobs);
    }

    // Prepare fileObjects from files on disk. Prepare blobs from files on disk when they don't exist yet.
    const newBlobs: Prisma.BlobCreateManyInput[] = [];
    const fileObjects = [];
    for (const file of files) {
      const hash = hashifyContent(file.content!);
      if (!previousBlobMap[hash]) {
        newBlobs.push({ data: file.content!, hash });
      }

      fileObjects.push({ name: file.path, hash });
    }

    const newlyCreatedBlobs = await this.blobRepository.createMany(newBlobs);

    const newlyCreatedBlobsMap = objectFromEntries('hash', newlyCreatedBlobs);
    // Populate file objects with their blob id from previous and new blob id maps
    // and all objects with snapshotId
    // Do not return hash, as that was only needed temporarily for blob lookup
    const fileObjectsToCreate = fileObjects.map(({ name, hash }) => ({
      snapshotId: snapshot.id,
      name,
      blobId: previousBlobMap[hash]?.id || newlyCreatedBlobsMap[hash]?.id
    }))
    const directoryObjectsToCreate = directories.map(dir => ({
      snapshotId: snapshot.id,
      name: dir.path
    }))

    const objects: Prisma.ObjectCreateManyInput[] = [...fileObjectsToCreate,...directoryObjectsToCreate];
    await this.objectRepository.createMany(objects);

    return snapshot;
  }
}