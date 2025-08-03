import { SnapshotRepository } from '../repositories/SnapshotRepository';
import { DirectoryRepository } from '../repositories/DirectoryRepository';
import { BlobRepository } from '../repositories/BlobRepository';
import { Snapshot } from '@prisma/client';
import { Filesystem } from '../../lib/Filesystem';
import { ObjectRepository } from '../repositories/ObjectRepository';
import { Prisma, Blob as PrismaBlob } from '@prisma/client';
import { hashifyContent } from '../../lib/crypto';
import { objectFromEntries } from '../../lib/generic';

export class CreateService {
  private snapshotRepository = new SnapshotRepository();
  private directoryRepository = new DirectoryRepository();
  private objectRepository = new ObjectRepository();
  private blobRepository = new BlobRepository();

  async createSnapshot(path: string): Promise<Snapshot> {

    const directory = await this.directoryRepository.findOrCreate(path);
    const previousSnapshot = await this.snapshotRepository.findLatestByDirectory(directory.id);
    const snapshot = await this.snapshotRepository.create(directory.id, previousSnapshot);

    const fileSystemObjects = await Filesystem.read(path);
    const files = fileSystemObjects.filter(obj => obj.content !== undefined);
    const directories = fileSystemObjects.filter(obj => obj.content === undefined);

    // Get ALL existing blobs by hash (much safer than just previous snapshot)
    // Create map here so we can look up hashes by path later.
    const filePathHashMap = Object.fromEntries(files.map(file => [file.path, hashifyContent(file.content!)]));
    const existingBlobs = await this.blobRepository.findManyByHashes(
      Object.values(filePathHashMap)
    );
    const existingBlobMap = objectFromEntries('hash', existingBlobs);

    // Prepare fileObjects from files on disk. Prepare blobs from files on disk when they don't exist yet.
    const newBlobs: Prisma.BlobCreateManyInput[] = [];
    const fileObjects = [];
    const processedHashes = new Set<string>(); // Track hashes we've already processed to avoid duplicates in newBlobs
    for (const file of files) {
      const hash = filePathHashMap[file.path];

      // Only create blob if
      // 1. it doesn't exist anywhere in database.
      // 2. AND we haven't already processed it in this snapshot.
      //    This is needed because we can have multiple files with the same content in the same snapshot
      if (!existingBlobMap[hash] && !processedHashes.has(hash)) {
        newBlobs.push({ data: file.content!, hash });
        processedHashes.add(hash);
      }

      // hash is added here temporarily to match with blobIds
      fileObjects.push({ name: file.path, hash });
    }



    const newlyCreatedBlobs = await this.blobRepository.createMany(newBlobs);
    const newlyCreatedBlobsMap = objectFromEntries('hash', newlyCreatedBlobs);

    // Populate file objects with their blob id from existing and new blob id maps
    // Populate all objects with snapshotId
    // Take hash and populate blobId with map lookup
    const fileObjectsToCreate = fileObjects.map(({ name, hash }) => ({
      snapshotId: snapshot.id,
      name,
      blobId: existingBlobMap[hash]?.id || newlyCreatedBlobsMap[hash]?.id
    }))
    const directoryObjectsToCreate = directories.map(dir => ({
      snapshotId: snapshot.id,
      name: dir.path
    }))

    await this.objectRepository.createMany([...fileObjectsToCreate, ...directoryObjectsToCreate]);

    return snapshot;
  }
}