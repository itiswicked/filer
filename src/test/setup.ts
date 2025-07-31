import { config } from 'dotenv';
import { resolve } from 'path';
import { prisma } from '../lib/prisma';
import { cleanDatabase } from './helpers';

// Load test environment variables
config({
  path: resolve(__dirname, '../../.env.test')
});

// Clean database before each test
beforeEach(async () => {
  await cleanDatabase();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});