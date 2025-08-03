import { Command } from 'commander';
import { Filer } from '../filer';
import { displaySnapshotList } from './formatters';

export function setupCommands(program: Command): void {
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

      displaySnapshotList(snapshots);
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
}