import { prisma } from '../lib/prisma';
import { mkdir, rmdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.$executeRaw`TRUNCATE TABLE "objects" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "snapshots" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "directory" CASCADE`
  ]);
}

// Filesystem helpers
export async function createTempDirectory(name?: string): Promise<string> {
  const testDir = join(tmpdir(), 'filer-test');
  await mkdir(testDir, { recursive: true });
  return testDir;
}

export async function createTestFile(dirPath: string, filename: string, content: string = 'test content'): Promise<string> {
  const filePath = join(dirPath, filename);
  await writeFile(filePath, content);
  return filePath;
}

export async function createTestDirectoryStructure(basePath: string, structure: Record<string, string | Record<string, any>>): Promise<void> {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = join(basePath, name);

    if (typeof content === 'string') {
      // It's a file
      await writeFile(fullPath, content);
    } else {
      // It's a directory
      await mkdir(fullPath, { recursive: true });
      await createTestDirectoryStructure(fullPath, content);
    }
  }
}

export async function cleanupTempDirectory(dirPath: string): Promise<void> {
  try {
    await rmdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}