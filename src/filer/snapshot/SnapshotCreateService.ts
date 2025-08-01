import { SnapshotRepository } from './SnapshotRepository';
import { DirectoryRepository } from '../directory/DirectoryRepository';
import { Snapshot } from '@prisma/client';
import { Filesystem, FileSystemEntry } from '../filesystem/Filesystem';
import { ObjectRepository } from '../object/ObjectRepository';
import { prisma } from '../../lib/prisma';
import { Prisma, Blob as PrismaBlob } from '@prisma/client';
import { hashifyContent } from '../../lib/cryptoHelper';
import { objectFromEntries } from '../../lib/generic';


export class SnapshotCreateService {
  private snapshotRepository = new SnapshotRepository();
  private directoryRepository = new DirectoryRepository();

  private objectRepository = new ObjectRepository();

  async createSnapshot(path: string): Promise<Snapshot> {
    const fileSystemObjects = await Filesystem.read(path);

    const directory = await this.directoryRepository .findOrCreate(path);

    const previousSnapshot = await this.snapshotRepository.findLatestByDirectory(directory.id);

    // Calculate the next snapshot number
    const snapshotNumber = previousSnapshot ? previousSnapshot.number + 1 : 1;
    const snapshot = await this.snapshotRepository.create(directory.id, snapshotNumber);

    let previousBlobMap: Record<string, PrismaBlob> = {};
    let previousObjects = [];
    if (previousSnapshot) {
      // Get all objects from previous snapshot
      previousObjects = await this.objectRepository.findMany(previousSnapshot.id);
      // Filter for file objects (those with blobs) and extract blobs
      const previousBlobs  = previousObjects
        .filter(obj => obj.Blob !== null)
        .map(obj => obj.Blob!);
      previousBlobMap = objectFromEntries('hash', previousBlobs);
    }


    const blobData = [];
    // Need to extend this type to allow hash matching in the in creation of
    // the objects.
    const objectData: (Prisma.ObjectCreateManyInput & {hash?: string})[] = [];
    for (const fileSystemObject of fileSystemObjects) {
      // It's a file - prepare object and blob data
      if (fileSystemObject.content !== undefined) {
        const hash = hashifyContent(fileSystemObject.content);
        // If it is a new file, aka wasn't part of the last snapshot.
        if (!previousBlobMap[hash]) {
          blobData.push({ data: fileSystemObject.content, hash });
        }

        objectData.push({
          snapshotId: snapshot.id,
          name: fileSystemObject.path,
          hash,
        });
      } else {
        // It's a directory - prepare object data
        objectData.push({
          snapshotId: snapshot.id,
          name: fileSystemObject.path
        });
      }
    }



    const newBlobs = blobData.length > 0
      ? await prisma.blob.createManyAndReturn({ data: blobData })
      : [];

    // Combine existing and new blob mappings
    const blobIdMap = {
      ...previousBlobMap,
      ...objectFromEntries('hash', newBlobs)
    };
    for (const object of objectData) {
      if (object.hash) {
        object.blobId = blobIdMap[object.hash]?.id;
      }
      delete object.hash;
    }

    await prisma.object.createMany({ data: objectData });



    return snapshot;
  }
}