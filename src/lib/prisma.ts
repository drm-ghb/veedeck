import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL + "?sslmode=require&connection_limit=10&pool_timeout=10",
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
