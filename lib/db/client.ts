import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

export function getDb(): PrismaClient | null {
  try {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    }
    return globalForPrisma.prisma;
  } catch (err) {
    console.warn("Prisma Client Initialization Warning:", err);
    return null;
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const prisma = getDb();
    if (!prisma) {
      throw new Error("Database client not available in current runtime environment");
    }
    const val = (prisma as any)[prop];
    if (typeof val === "function") {
      return val.bind(prisma);
    }
    return val;
  },
});
