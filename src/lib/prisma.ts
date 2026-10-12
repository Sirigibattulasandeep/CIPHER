import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { sentrixPrisma?: PrismaClient };

export const prisma = globalForPrisma.sentrixPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.sentrixPrisma = prisma;
