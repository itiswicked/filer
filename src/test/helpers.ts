import { mkdir, rmdir, writeFile, readdir, unlink, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function createTempDirectory(name?: string): Promise<string> {
  const dirName = name || `filer-test-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const testDir = join(tmpdir(), dirName);
  await mkdir(testDir, { recursive: true });
  return testDir;
}

export async function createTestFile(dirPath: string, filename: string, content: string = 'test content'): Promise<string> {
  const filePath = join(dirPath, filename);
  await writeFile(filePath, content);
  return filePath;
}

async function clearDirectory(dirPath: string): Promise<void> {
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await rmdir(fullPath, { recursive: true });
      } else {
        await unlink(fullPath);
      }
    }
  } catch (error) {
    // Ignore errors if directory doesn't exist or is already empty
  }
}

export async function createTestDirectoryStructure(basePath: string, structure: Record<string, string | Record<string, any>>): Promise<void> {
  // Clear existing content to ensure the structure represents the complete new state
  await clearDirectory(basePath);

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

// Helper to recursively read directory structure and contents
async function readDirectoryStructure(dirPath: string, basePath: string = dirPath): Promise<Record<string, string | Record<string, any>>> {
  const structure: Record<string, string | Record<string, any>> = {};

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);

      if (stats.isFile()) {
        const content = await readFile(fullPath, 'utf8');
        structure[entry] = content;
      } else if (stats.isDirectory()) {
        structure[entry] = await readDirectoryStructure(fullPath, basePath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or is empty
  }

  return structure;
}

export async function assertDirectoryStructureEquals(
  actualDirPath: string,
  expectedStructure: Record<string, string | Record<string, any>>,
): Promise<void> {
  const actualStructure = await readDirectoryStructure(actualDirPath);

  deepEqual(actualStructure, expectedStructure);
}

function deepEqual(actual: any, expected: any, path: string = ""): void {
  const message = "Directory structure mismatch";
  if (typeof expected === 'string') {
    if (typeof actual !== 'string') {
      throw new Error(`${message}: Expected file at '${path}', but found ${typeof actual}`);
    }
    if (actual !== expected) {
      throw new Error(`${message}: File content mismatch at '${path}'. Expected: '${expected}', Actual: '${actual}'`);
    }
  } else if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null) {
      throw new Error(`${message}: Expected directory at '${path}', but found ${typeof actual}`);
    }

    // Check all expected entries exist
    for (const [key, value] of Object.entries(expected)) {
      const currentPath = path ? `${path}/${key}` : key;
      if (!(key in actual)) {
        throw new Error(`${message}: Missing expected entry '${currentPath}'`);
      }
      deepEqual(actual[key], value, currentPath);
    }

    // Check no extra entries exist
    for (const key of Object.keys(actual)) {
      if (!(key in expected)) {
        const currentPath = path ? `${path}/${key}` : key;
        throw new Error(`${message}: Unexpected entry '${currentPath}' found`);
      }
    }
  }
}