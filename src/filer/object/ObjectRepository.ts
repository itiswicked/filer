import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class ObjectRepository {
  async createMany(objects: Prisma.ObjectCreateManyInput[]): Promise<void> {
    await prisma.object.createMany({ data: objects });
  }

  async findMany(snapshotId: number) {
    return await prisma.object.findMany({
      where: { snapshotId },
      include: { Blob: true }
    });
  }
}