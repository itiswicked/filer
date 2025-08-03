/**
 * CLI Commands Tests - Direct Program Object Testing
 * These tests use the program object directly for faster, isolated testing
 */

import { createCLI } from '../index';
import { disconnectPrisma } from '../../../lib/prisma';
import { Command } from 'commander';
import { createTempDirectory, createTestFile, cleanupTempDirectory, assertDirectoryStructureEquals } from '../../../test/helpers';

describe('CLI Commands', () => {
  let testDir: string;
  let outputDir: string;
  let program: Command;
  let consoleLogSpy: jest.SpyInstance;

  beforeAll(() => {
    program = createCLI();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  beforeEach(async () => {
    testDir = await createTempDirectory('filer-cli-test');
    outputDir = await createTempDirectory('filer-cli-output');
    await createTestFile(testDir, 'test.txt', 'test file content');
    consoleLogSpy.mockClear();
  });

  afterEach(async () => {
    await cleanupTempDirectory(testDir);
    await cleanupTempDirectory(outputDir);
  });

  afterAll(async () => {
    consoleLogSpy.mockRestore();
    await disconnectPrisma();
  });

  it('should list snapshots', async () => {
    await program.parseAsync(['node', 'filer', 'list', '--target-directory', testDir]);

    expect(consoleLogSpy).toHaveBeenCalledWith(`No snapshots found for directory: ${testDir}`);
  });
  it('should create snapshot', async () => {
    await program.parseAsync(['node', 'filer', 'snapshot', '--target-directory', testDir]);

    expect(consoleLogSpy).toHaveBeenCalledWith(`Snapshot created for directory: ${testDir}`);
  });

  it('should restore snapshot', async () => {
    // First create a snapshot
    await program.parseAsync(['node', 'filer', 'snapshot', '--target-directory', testDir]);
    expect(consoleLogSpy).toHaveBeenCalledWith(`Snapshot created for directory: ${testDir}`);

    // Clear previous calls and restore snapshot 1 (fresh test database)
    consoleLogSpy.mockClear();
    await program.parseAsync(['node', 'filer', 'restore', '--target-directory', testDir, '--snapshot-number', '1', '--output-directory', outputDir]);

    expect(consoleLogSpy).toHaveBeenCalledWith(`Snapshot 1 restored to: ${outputDir}`);

    // Verify the file was restored with correct structure and content
    await assertDirectoryStructureEquals(outputDir, {
      'test.txt': 'test file content'
    });
  });

  it('should prune snapshots', async () => {
    // First create a snapshot
    await program.parseAsync(['node', 'filer', 'snapshot', '--target-directory', testDir]);
    expect(consoleLogSpy).toHaveBeenCalledWith(`Snapshot created for directory: ${testDir}`);

    // Clear previous calls and prune snapshot 1 (fresh test database)
    consoleLogSpy.mockClear();
    await program.parseAsync(['node', 'filer', 'prune', '--target-directory', testDir, '--snapshot-number', '1']);

    expect(consoleLogSpy).toHaveBeenCalledWith(`Snapshot 1 pruned from directory: ${testDir}`);
  });
});