import { prisma } from '../../lib/prisma';
import { Directory } from '@prisma/client';

export class DirectoryRepository {
  async findOrCreate(path: string): Promise<Directory> {
    let directory = await this.findByPath(path);

    if (!directory) {
      directory = await prisma.directory.create({
        data: { path }
      });
    }

    return directory;
  }

  async findByPath(path: string): Promise<Directory | null> {
    return await prisma.directory.findUnique({
      where: { path }
    });
  }
}