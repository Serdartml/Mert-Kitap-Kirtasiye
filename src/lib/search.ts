import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { escapeLike, foldTr, FOLD_FROM, FOLD_TO, searchTokens } from "./search-fold";

// Kolonun katlanmış hâli (search-fold.ts ile aynı eşleme). Arama indeksleri bu ifadenin aynısı üzerinde kuruludur
// (migration: arama_katlama_indeksleri); ifade değişirse indeks de değişmeli, yoksa indeks kullanılmaz.
export const foldSql = (column: string) => `lower(translate(${column}, '${FOLD_FROM}', '${FOLD_TO}'))`;

const MAX_MATCHES = 2000;

// Aramayla eşleşen aktif ürünlerin id'leri, en alakalıdan başlayarak:
//   0 ad ya da stok kodu aramayla birebir aynı (ya da barkod), 1 ad aramayla başlıyor, 2 adda bir kelime aramayla başlıyor,
//   3 tüm kelimeler adda geçiyor, 4 "marka + ad" aramayla başlıyor ya da yalnızca marka aramayla aynı,
//   5 kelimeler marka ve adda geçiyor, 6 kelimeler stok kodunda geçiyor. Eşitlikte öne çıkanlar, sonra ada göre.
// Çok kelimeli aramada her kelime ad, marka ya da stok kodunda geçmeli (sıra önemsiz: "kalem dolma" = "dolma kalem";
// "serve deep": "serve" markada, "deep" adda). Toptancı markaları aranmaz: dağıtıcı adı ilgisiz ürünleri getirir
// (ürün sayfasında da gösterilmez). Açıklama aranmaz: otomatik açıklamalardaki genel kelimeler ilgisiz ürünleri taşır.
export async function searchProductIds(query: string, limit = MAX_MATCHES): Promise<string[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  const phrase = tokens.join(" ");
  const name = Prisma.raw(foldSql('p."name"'));
  const sku = Prisma.raw(foldSql('p."sku"'));
  const brand = Prisma.raw(foldSql(`coalesce(b."name", '')`));
  const brandAndName = Prisma.raw(foldSql(`coalesce(b."name" || ' ', '') || p."name"`));
  const like = (token: string) => `%${escapeLike(token)}%`;

  const anywhere = tokens.map(
    (token) =>
      Prisma.sql`(${name} LIKE ${like(token)} ESCAPE '!' OR ${brand} LIKE ${like(token)} ESCAPE '!' OR ${sku} LIKE ${like(token)} ESCAPE '!')`,
  );
  const inName = tokens.map((token) => Prisma.sql`${name} LIKE ${like(token)} ESCAPE '!'`);
  const inBrandOrName = tokens.map((token) => Prisma.sql`${brandAndName} LIKE ${like(token)} ESCAPE '!'`);

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id"
    FROM "Product" p
    LEFT JOIN "Brand" b ON b."id" = p."brandId" AND b."isWholesaler" = false
    WHERE p."isActive" = true
      AND ((${Prisma.join(anywhere, " AND ")}) OR p."barcode" = ${query.trim()})
    ORDER BY
      CASE
        WHEN p."barcode" = ${query.trim()} OR ${name} = ${phrase} OR ${sku} = ${phrase} THEN 0
        WHEN ${name} LIKE ${`${escapeLike(phrase)}%`} ESCAPE '!' THEN 1
        WHEN ${name} LIKE ${`% ${escapeLike(phrase)}%`} ESCAPE '!' THEN 2
        WHEN ${Prisma.join(inName, " AND ")} THEN 3
        WHEN ${brandAndName} LIKE ${`${escapeLike(phrase)}%`} ESCAPE '!' OR ${brand} = ${phrase} THEN 4
        WHEN ${Prisma.join(inBrandOrName, " AND ")} THEN 5
        ELSE 6
      END,
      p."isFeatured" DESC,
      p."name" ASC
    LIMIT ${limit}`;

  return rows.map((row) => row.id);
}

// Kategori adı aramayla eşleşiyor mu (öneri kutusu): tüm kelimeler adda geçmeli.
export function matchesAllTokens(text: string, query: string): boolean {
  const folded = foldTr(text);
  const tokens = searchTokens(query);
  return tokens.length > 0 && tokens.every((token) => folded.includes(token));
}
