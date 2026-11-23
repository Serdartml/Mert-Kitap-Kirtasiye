import { Prisma, PrismaClient } from "@prisma/client";
import { generateDescription } from "../src/lib/product-description";

// Açıklaması boş ürünlere addan ve kategoriden açıklama yazar. Dolu açıklamalara dokunmaz.
//   npm run aciklama:yaz              yalnızca sayı ve örnek gösterir
//   npm run aciklama:yaz -- --yaz     veritabanına yazar

const db = new PrismaClient();
const write = process.argv.includes("--yaz");

async function main() {
  const products = await db.product.findMany({
    where: { OR: [{ description: null }, { description: "" }] },
    select: { id: true, name: true, category: { select: { name: true, parent: { select: { name: true } } } } },
  });
  const rows = products.map((product) => {
    const root = product.category.parent?.name ?? product.category.name;
    const sub = product.category.parent ? product.category.name : null;
    return { id: product.id, root, description: generateDescription({ name: product.name, root, sub }) };
  });
  console.log(`Açıklaması boş ürün: ${rows.length}`);
  const seenRoots = new Set<string>();
  for (const row of rows) {
    if (seenRoots.has(row.root)) continue;
    seenRoots.add(row.root);
    console.log(`\n[${row.root}]\n${row.description}`);
  }
  if (!write) return;

  let done = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const values = rows.slice(index, index + 500).map((row) => Prisma.sql`(${row.id}::text, ${row.description}::text)`);
    // updatedAt değişmez: yönetim listesindeki "son güncellenen" sırası bozulmasın.
    done += await db.$executeRaw`
      UPDATE "Product" AS p SET "description" = v."description"
      FROM (VALUES ${Prisma.join(values)}) AS v("id", "description")
      WHERE p."id" = v."id" AND (p."description" IS NULL OR p."description" = '')`;
  }
  console.log(`\nYazıldı: ${done}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
