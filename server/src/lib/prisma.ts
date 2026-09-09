import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

export const prisma = new PrismaClient({
  log: isProduction ? ['warn', 'error'] : ['warn', 'error']
});

export type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
