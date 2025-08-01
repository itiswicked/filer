import { prisma } from '../../lib/prisma';
import { Snapshot } from '@prisma/client';

export class SnapshotRepository {
  async create(directoryId: number, number: number): Promise<Snapshot> {
    return await prisma.snapshot.create({data: { directoryId, number }});
  }

  async findLatestByDirectory(directoryId: number): Promise<Snapshot | null> {
    return await prisma.snapshot.findFirst({
      where: { directoryId },
      orderBy: { number: 'desc' }
    });
  }

  async findByIdWithObjectsAndBlobs(id: number) {
    return await prisma.snapshot.findUnique({
      where: { id },
      include: {
        objects: {
          include: {
            Blob: true
          }
        }
      }
    });
  }
}