import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

export interface FileSystemEntry {
  path: string;
  content?: Buffer;
}

export class FilesystemRepository {
  async entries(directoryPath: string): Promise<FileSystemEntry[]> {
    const entries: FileSystemEntry[] = [];
    await this.scan(directoryPath, directoryPath, entries);
    return entries;
  }

  private async scan(rootPath: string, currentPath: string, entries: FileSystemEntry[]): Promise<void> {
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
          path: relativePath + '/'
        });

        // Recursively scan subdirectory
        await this.scan(rootPath, fullPath, entries);
      }
    }
  }
}