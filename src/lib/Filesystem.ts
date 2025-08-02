import { readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { join, relative } from 'path';

export interface FileSystemEntry {
  path: string;
  content?: Buffer;
}

export class Filesystem {
  static async read(rootPath: string, currentPath: string = rootPath, entries: FileSystemEntry[] = []): Promise<FileSystemEntry[]> {
    const dirEntries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(rootPath, fullPath);

      if (entry.isFile()) {
        const fileContent = await readFile(fullPath);
        entries.push({
          path: relativePath,
          content: fileContent
        });
      } else if (entry.isDirectory()) {
        entries.push({
          path: relativePath + '/',
          content: undefined
        });

        // Recursively scan subdirectory
        await Filesystem.read(rootPath, fullPath, entries);
      }
    }
    return entries;
  }

  static async write(entries: FileSystemEntry[], targetDirectory: string): Promise<void> {
    const sortedEntries = entries.sort((a, b) => a.path.length - b.path.length);

    for (const entry of sortedEntries) {
      const fullPath = join(targetDirectory, entry.path);

      if (entry.path.endsWith('/')) {
        await mkdir(fullPath, { recursive: true });
      } else {
        await writeFile(fullPath, entry.content!);
      }
    }
  }
}