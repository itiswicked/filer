import { PrismaClient } from '@prisma/client'

class PrismaWrapper {
  private static instance: PrismaWrapper | null = null;
  private _prisma: PrismaClient;

  private constructor() {
    this._prisma = new PrismaClient();
  }

  public static getInstance(): PrismaWrapper {
    if (!PrismaWrapper.instance) {
      PrismaWrapper.instance = new PrismaWrapper();
    }
    return PrismaWrapper.instance;
  }

  public get prisma(): PrismaClient {
    return this._prisma;
  }

  public async disconnect(): Promise<void> {
    await this._prisma.$disconnect();
  }
}

// Export a singleton instance
export const prisma = PrismaWrapper.getInstance().prisma;

// Export the disconnect method for cleanup
export const disconnectPrisma = async () => {
  await PrismaWrapper.getInstance().disconnect();
};