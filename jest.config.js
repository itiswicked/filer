/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/src/test/env-setup.ts'], // Load env vars BEFORE any imports
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  maxWorkers: 1, // Run tests sequentially to avoid database deadlocks
};