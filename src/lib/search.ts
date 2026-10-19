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
//   3 tüm kelimeler adda geçiyor, 4 kelimeler açıklamada / stok kodunda geçiyor. Eşitlikte öne çıkanlar, sonra ada göre.
// Çok kelimeli aramada her kelime ad, açıklama ya da stok kodunda geçmeli (sıra önemsiz: "kalem dolma" = "dolma kalem").
export async function searchProductIds(query: string, limit = MAX_MATCHES): Promise<string[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  const phrase = tokens.join(" ");
  const name = Prisma.raw(foldSql('p."name"'));
  const description = Prisma.raw(foldSql('p."description"'));
  const sku = Prisma.raw(foldSql('p."sku"'));
  const like = (token: string) => `%${escapeLike(token)}%`;

  const anywhere = tokens.map((token) => Prisma.sql`(${name} LIKE ${like(token)} ESCAPE '!' OR ${description} LIKE ${like(token)} ESCAPE '!' OR ${sku} LIKE ${like(token)} ESCAPE '!')`);
  const inName = tokens.map((token) => Prisma.sql`${name} LIKE ${like(token)} ESCAPE '!'`);

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id"
    FROM "Product" p
    WHERE p."isActive" = true
      AND ((${Prisma.join(anywhere, " AND ")}) OR p."barcode" = ${query.trim()})
    ORDER BY
      CASE
        WHEN p."barcode" = ${query.trim()} OR ${name} = ${phrase} OR ${sku} = ${phrase} THEN 0
        WHEN ${name} LIKE ${`${escapeLike(phrase)}%`} ESCAPE '!' THEN 1
        WHEN ${name} LIKE ${`% ${escapeLike(phrase)}%`} ESCAPE '!' THEN 2
        WHEN ${Prisma.join(inName, " AND ")} THEN 3
        ELSE 4
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
