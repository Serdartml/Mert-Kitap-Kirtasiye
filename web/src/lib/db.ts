import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

// Geliştirmede hot-reload her seferinde yeni bağlantı açmasın.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
