// Üretilmiş örnek ürünleri (prisma/sample-products.ts: her ana kategoriye 18'er, toplam 108) veritabanına ekler.
// Var olan ürünlere ve başka verilere dokunmaz; tekrar çalıştırmak güvenlidir (olanlar atlanır).
// Kullanım: npm run db:seed-more   (kategoriler yoksa önce npm run db:seed)
import { PrismaClient } from "@prisma/client";
import { seedGeneratedProducts } from "../prisma/sample-products";

const db = new PrismaClient();

seedGeneratedProducts(db)
  .then(({ created, existing }) => console.log(`${created} ürün eklendi, ${existing} ürün zaten vardı.`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
