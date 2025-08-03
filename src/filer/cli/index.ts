import { Command } from 'commander';
import { setupCommands } from './commands';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('filer')
    .description('CLI tool with database support')
    .version('1.0.0');

  setupCommands(program);

  return program;
}