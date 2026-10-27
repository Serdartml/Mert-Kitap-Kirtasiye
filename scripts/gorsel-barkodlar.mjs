// Salt okunur: görsel kapsama özeti (ana kategoriye göre).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const cats = await db.category.findMany({ select: { id: true, name: true, parentId: true } });
const rootOf = Object.fromEntries(cats.map((c) => [c.id, cats.find((p) => p.id === c.parentId)?.name ?? c.name]));
const products = await db.product.findMany({ select: { categoryId: true, _count: { select: { images: true } } } });
const by = {};
for (const p of products) {
  const r = rootOf[p.categoryId];
  by[r] ??= { toplam: 0, gorselli: 0 };
  by[r].toplam++;
  if (p._count.images) by[r].gorselli++;
}
let t = 0, g = 0;
for (const [r, v] of Object.entries(by)) {
  t += v.toplam;
  g += v.gorselli;
  console.log(`${r.padEnd(20)} ${String(v.gorselli).padStart(5)} / ${String(v.toplam).padEnd(5)} (%${Math.round((100 * v.gorselli) / v.toplam)})`);
}
console.log(`${"TOPLAM".padEnd(20)} ${String(g).padStart(5)} / ${t} (%${Math.round((100 * g) / t)})`);
await db.$disconnect();
