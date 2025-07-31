#!/usr/bin/env node

import { Command } from 'commander';
import { Filer } from './filer/filer';

const program = new Command();

program
  .name('filer')
  .description('CLI tool with database support')
  .version('1.0.0');

// Command 1: List all snapshots
async function listSnapshots() {
  console.log('Function: listSnapshots');
}

// Command 2: Get snapshot details
async function getSnapshot(id: string) {
  console.log('Function: getSnapshot', { id });
}

// Command 3: Create snapshot
async function createSnapshot(path: string) {
  await Filer.createSnapshot(path);
}

program
  .command('list')
  .description('List all snapshots')
  .action(listSnapshots);

program
  .command('get')
  .description('Get details about a specific snapshot')
  .action(getSnapshot);

program
  .command('create <path>')
  .description('Create a new snapshot for the specified directory path')
  .action(createSnapshot);

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

main();