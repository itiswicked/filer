import { prisma } from '../../lib/prisma';
import { Object as PrismaObject } from '@prisma/client';
import { FileSystemEntry } from '../filesystem/FilesystemRepository';

export class ObjectRepository {

  async createMany(snapshotId: number, files: FileSystemEntry[]): Promise<void> {
    const objectData = [];
    for (const file of files) {
      objectData.push({
        snapshotId,
        name: file.path,
      });
    }

    await prisma.object.createMany({ data: objectData });
  }

  async findMany(snapshotId: number) {
    return await prisma.object.findMany({
      where: { snapshotId },
      include: { Blob: true }
    });
  }
}