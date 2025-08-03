#!/usr/bin/env node

import { createCLI } from './filer/cli';
import { disconnectPrisma } from './lib/prisma';

(async function main() {
  const program = createCLI();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
})();