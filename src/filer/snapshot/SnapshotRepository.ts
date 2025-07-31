import { prisma } from '../../lib/prisma';
import { Snapshot } from '@prisma/client';

export class SnapshotRepository {
  async create(directoryId: number): Promise<Snapshot> {
    return await prisma.snapshot.create({data: { directoryId }});
  }

  async findParentSnapshot(snapshot: Snapshot): Promise<Snapshot | null> {
    return await prisma.snapshot.findFirst({
      where: {
        directoryId: snapshot.directoryId,
        createdAt: { lt: snapshot.createdAt }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}