import { prisma } from '../../lib/prisma';
import { Snapshot } from '@prisma/client';

export class SnapshotRepository {
  async create(directoryId: number, previousSnapshot?: Snapshot | null): Promise<Snapshot> {
    const number = this.calculateNextNumber(previousSnapshot);
    return await prisma.snapshot.create({data: { directoryId, number }});
  }

  async findLatestByDirectory(directoryId: number): Promise<Snapshot | null> {
    return await prisma.snapshot.findFirst({
      where: { directoryId },
      orderBy: { number: 'desc' }
    });
  }

  async findByDirectoryAndNumberWithObjectsAndBlobs(directoryId: number, number: number) {
    return await prisma.snapshot.findFirst({
      where: {
        directoryId,
        number
      },
      include: {
        objects: {
          include: {
            Blob: true
          }
        }
      }
    });
  }

  async findByDirectoryAndNumber(directoryId: number, number: number): Promise<Snapshot | null> {
    return await prisma.snapshot.findFirst({
      where: {
        directoryId,
        number
      }
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.snapshot.delete({
      where: { id }
    });
  }

  async findAllByDirectoryPath(directoryPath: string): Promise<Snapshot[]> {
    return await prisma.snapshot.findMany({
      where: {
        directory: {
          path: directoryPath
        }
      },
      orderBy: {
        number: 'asc'
      }
    });
  }

  private calculateNextNumber(previousSnapshot?: Snapshot | null): number {
    return previousSnapshot ? previousSnapshot.number + 1 : 1;
  }

}