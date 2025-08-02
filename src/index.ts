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
  .command('list <path>')
  .description('List all snapshots for the specified directory path')
  .action(async function (path: string) {
    const snapshots = await Filer.listSnapshots(path);

    if (snapshots.length === 0) {
      console.log(`No snapshots found for directory: ${path}`);
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
  .command('snapshot <path>')
  .description('Create a new snapshot for the specified directory path')
  .action(async (path: string) => {
    await Filer.createSnapshot(path);
  });

program
  .command('restore <target-directory> <snapshot-number> <output-directory>')
  .description('Restore a snapshot to the specified output directory')
  .action(async (targetDirectory: string, snapshotNumber: string, outputDirectory: string) => {
    const snapNum = parseInt(snapshotNumber);
    const restoredPath = await Filer.restoreSnapshot(targetDirectory, snapNum, outputDirectory);
    console.log(`Snapshot ${snapNum} restored to: ${restoredPath}`);
  });

program
  .command('prune <target-directory> <snapshot-number>')
  .description('Prune (delete) a specific snapshot')
  .action(async (targetDirectory: string, snapshotNumber: string) => {
    const snapNum = parseInt(snapshotNumber);
    await Filer.pruneSnapshot(targetDirectory, snapNum);
    console.log(`Snapshot ${snapNum} pruned from directory: ${targetDirectory}`);
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