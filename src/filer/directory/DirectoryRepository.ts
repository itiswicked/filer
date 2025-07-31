import { prisma } from '../../lib/prisma';
import { Directory } from '@prisma/client';

export class DirectoryRepository {
  async findOrCreate(path: string): Promise<Directory> {
    let directory = await prisma.directory.findUnique({
      where: { path }
    });

    if (!directory) {
      directory = await prisma.directory.create({
        data: { path }
      });
    }

    return directory;
  }
}