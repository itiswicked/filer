#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const program = new commander_1.Command();
program
    .name('filer')
    .description('CLI tool with database support')
    .version('1.0.0');
// Command 1: List all snapshots
async function listSnapshots() {
    console.log('Function: listSnapshots');
}
// Command 2: Get snapshot details
async function getSnapshot(id) {
    console.log('Function: getSnapshot', { id });
}
// Command 3: Create snapshot
async function createSnapshot(directoryId) {
    console.log('Function: createSnapshot', { directoryId });
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
    .command('create <directoryId>')
    .description('Create a new snapshot')
    .action(createSnapshot);
async function main() {
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
