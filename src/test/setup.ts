import { prisma } from '../lib/prisma';

// Clean database before each test
beforeEach(async () => {
  await cleanDatabase();
});

// Clean up before all tests (for watch mode)
beforeAll(async () => {
  await cleanDatabase();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Clean database function for tests
async function cleanDatabase() {
  await prisma.$transaction([
    prisma.$executeRaw`TRUNCATE TABLE "blobs" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "objects" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "snapshots" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "directory" CASCADE`
  ]);
}
