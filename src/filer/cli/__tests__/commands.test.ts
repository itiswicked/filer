/**
 * CLI Commands Tests - Real Command Line Execution
 * These tests execute actual CLI commands via child process
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('CLI Commands', () => {
  const cliCommand = './bin/filer';
  const testDir = './test-data';

  beforeAll(async () => {
    // Create test directory
    await execAsync(`mkdir -p ${testDir}`);
    await execAsync(`echo "test file content" > ${testDir}/test.txt`);
  });

  afterAll(async () => {
    // Clean up test directories
    await execAsync(`rm -rf ${testDir}`);
    await execAsync(`rm -rf ./test-restore-output`);
  });

  it('should list snapshots', async () => {
    const { stdout } = await execAsync(`${cliCommand} list --target-directory ${testDir}`);

    expect(stdout).toBeDefined();
    // Should show "No snapshots found" message or snapshot table headers
    expect(stdout).toMatch(/No snapshots found for directory|Number\s+Datetime/);
  });

  it('should create snapshot', async () => {
    const { stdout } = await execAsync(`${cliCommand} snapshot --target-directory ${testDir}`);

    expect(stdout).toBeDefined();
    expect(stdout).toContain(`Snapshot created for directory: ${testDir}`);
  });

  it('should restore snapshot', async () => {
    const outputDir = './test-restore-output';

    // First create a snapshot
    await execAsync(`${cliCommand} snapshot --target-directory ${testDir}`);

    // Create output directory
    await execAsync(`mkdir -p ${outputDir}`);

    const { stdout } = await execAsync(`${cliCommand} restore --target-directory ${testDir} --snapshot-number 1 --output-directory ${outputDir}`);

    expect(stdout).toBeDefined();
    expect(stdout).toContain(`Snapshot 1 restored to: ${outputDir}`);

    // Clean up
    await execAsync(`rm -rf ${outputDir}`);
  });

  it('should prune snapshots', async () => {
    // First create a snapshot
    await execAsync(`${cliCommand} snapshot --target-directory ${testDir}`);

    const { stdout } = await execAsync(`${cliCommand} prune --target-directory ${testDir} --snapshot-number 1`);

    expect(stdout).toBeDefined();
    expect(stdout).toContain(`Snapshot 1 pruned from directory: ${testDir}`);
  });
});