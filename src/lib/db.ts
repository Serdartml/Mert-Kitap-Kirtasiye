import "server-only";
import { PrismaClient } from "@prisma/client";

// Alış fiyatı gizlidir: ürün sorguları (katalog dahil) varsayılan olarak onu döndürmez, böylece sayfa verisine karışıp
// tarayıcıya gidemez. Yönetim sayfaları gerektiğinde `omit: { costKurus: false }` ile açıkça ister.
const createClient = () => new PrismaClient({ omit: { product: { costKurus: true } } });

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

// Geliştirmede hot-reload her seferinde yeni bağlantı açmasın.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
