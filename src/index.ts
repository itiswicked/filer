#!/usr/bin/env node

import { Command } from 'commander';
import { Filer } from './filer/filer';
import { disconnectPrisma } from './lib/prisma';

const program = new Command();

program
  .name('filer')
  .description('CLI tool with database support')
  .version('1.0.0');

// Command 1: List all snapshots for directory

program
  .command('list')
  .description('List all snapshots for the specified directory path')
  .requiredOption('--target-directory <path>', 'Directory path to list snapshots for')
  .action(async function (options: { targetDirectory: string }) {
    const snapshots = await Filer.listSnapshots(options.targetDirectory);

    if (snapshots.length === 0) {
      console.log(`No snapshots found for directory: ${options.targetDirectory}`);
      return;
    }

    // Create formatted output with number and datetime columns
    console.log('Number  Datetime');
    console.log('------  --------');

    for (const snapshot of snapshots) {
      const numberStr = snapshot.number.toString().padEnd(6);
      const formattedDate = formatDate(snapshot.date);
      console.log(`${numberStr}  ${formattedDate}`);
    }
  });

program
  .command('snapshot')
  .description('Create a new snapshot for the specified directory path')
  .requiredOption('--target-directory <path>', 'Directory path to create snapshot for')
  .action(async (options: { targetDirectory: string }) => {
    await Filer.createSnapshot(options.targetDirectory);
    console.log(`Snapshot created for directory: ${options.targetDirectory}`);
  });

program
  .command('restore')
  .description('Restore a snapshot to the specified output directory')
  .requiredOption('--target-directory <path>', 'Directory path where the snapshot was originally taken from')
  .requiredOption('--snapshot-number <number>', 'Snapshot number to restore')
  .requiredOption('--output-directory <path>', 'Directory path to restore snapshot to')
  .action(async (options: { targetDirectory: string, snapshotNumber: string, outputDirectory: string }) => {
    const snapNum = parseInt(options.snapshotNumber);
    const restoredPath = await Filer.restoreSnapshot(options.targetDirectory, snapNum, options.outputDirectory);
    console.log(`Snapshot ${snapNum} restored to: ${restoredPath}`);
  });

program
  .command('prune')
  .description('Prune (delete) a specific snapshot')
  .requiredOption('--target-directory <path>', 'Directory path containing the snapshot to prune')
  .requiredOption('--snapshot-number <number>', 'Snapshot number to prune')
  .action(async (options: { targetDirectory: string, snapshotNumber: string }) => {
    const snapNum = parseInt(options.snapshotNumber);
    await Filer.pruneSnapshot(options.targetDirectory, snapNum);
    console.log(`Snapshot ${snapNum} pruned from directory: ${options.targetDirectory}`);
  });

function formatDate(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${month} ${day}, ${year} - ${hours}:${minutes}:${seconds}`;
}

(async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
})();