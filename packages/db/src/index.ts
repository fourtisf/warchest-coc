import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

let client: PrismaClient | null = null;

/** Singleton Prisma client. */
export function prisma(): PrismaClient {
  if (!client) client = new PrismaClient();
  return client;
}
