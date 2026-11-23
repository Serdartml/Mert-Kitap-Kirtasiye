import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { readSheet } from "read-excel-file/node";
import { readTurnaRows } from "../src/lib/turna-catalog";

// İlk kurulum: önceki Turna dosyasında olup bugün sitede olmayan her ürünü "siteden çıkarılmış" olarak kaydeder.
// Böylece ilk haftalık dosya, daha önce silinen ya da elenen ürünleri yeniden eklemez.
//   npx tsx --env-file=.env scripts/turna-haric-tohumla.ts stok-temiz.xlsx          yalnızca sayar
//   npx tsx --env-file=.env scripts/turna-haric-tohumla.ts stok-temiz.xlsx --yaz    kaydeder

const db = new PrismaClient();
const [input] = process.argv.slice(2);
const write = process.argv.includes("--yaz");

async function main() {
  if (!input) throw new Error("Turna dosyası verilmedi.");
  const items = readTurnaRows((await readSheet(readFileSync(input))) as unknown[][]);
  const products = await db.product.findMany({ select: { sku: true, barcode: true } });
  const skus = new Set(products.map((product) => product.sku));
  const barcodes = new Set(products.flatMap((product) => (product.barcode ? [product.barcode] : [])));

  const seen = new Set<string>();
  const rows = items.flatMap((item) => {
    if (!item.code || seen.has(item.code) || skus.has(item.code) || (item.barcode && barcodes.has(item.barcode))) return [];
    seen.add(item.code);
    return [{ sku: item.code, barcode: item.barcode || null, name: item.name.slice(0, 200) || item.code, reason: "İlk katalogda elendi ya da sonradan silindi" }];
  });
  console.log(`Dosyada ${items.length} satır, sitede ${products.length} ürün, kaydedilecek ${rows.length}.`);
  if (!write) return;
  let created = 0;
  for (let index = 0; index < rows.length; index += 1000) {
    created += (await db.excludedProduct.createMany({ data: rows.slice(index, index + 1000), skipDuplicates: true })).count;
  }
  console.log(`Kaydedildi: ${created}. Toplam: ${await db.excludedProduct.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
