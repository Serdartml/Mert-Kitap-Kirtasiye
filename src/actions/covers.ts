"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { downloadCover, isIsbn13, lookupCoverUrls } from "@/lib/book-covers";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { r2Config, uploadObject } from "@/lib/r2";

// Bir seferde işlenen ürün sayısı: sunucu işlevi süre sınırına (Vercel) takılmasın diye küçük tutulur; sayfa art arda çağırır.
const BATCH = 8;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export interface CoverBatchResult {
  error: string;
  scanned: number;
  added: number;
  // Open Library'de kapağı bulunan kitap sayısı (eklenenden fazlaysa indirmede sorun vardır).
  found: number;
  // Başarısızlık nedenleri (arama/indirme), tanı için.
  problems: string[];
  // Sonraki çağrıda verilecek imleç; null ise taranacak ürün kalmadı.
  cursor: string | null;
}

// Görseli olmayan ISBN barkodlu ürünler için sıradaki grubun kapağını bulup R2'ye kopyalar, ürüne tek görsel olarak ekler.
export async function fetchBarcodeCovers(cursor: string): Promise<CoverBatchResult> {
  await requireAdmin();

  const config = r2Config();
  if (!config) return { error: "Görsel depolama (Cloudflare R2) bağlı değil.", scanned: 0, added: 0, found: 0, problems: [], cursor: null };

  const products = await db.product.findMany({
    where: {
      OR: [{ barcode: { startsWith: "978" } }, { barcode: { startsWith: "979" } }],
      images: { none: {} },
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { id: "asc" },
    take: BATCH,
    select: { id: true, barcode: true },
  });
  if (products.length === 0) return { error: "", scanned: 0, added: 0, found: 0, problems: [], cursor: null };

  const withIsbn = products.filter((product): product is { id: string; barcode: string } => !!product.barcode && isIsbn13(product.barcode));
  const { urls, problem: lookupProblem } = await lookupCoverUrls(withIsbn.map((product) => product.barcode));

  let added = 0;
  const problems: string[] = lookupProblem ? [lookupProblem] : [];
  await Promise.all(
    withIsbn.map(async (product) => {
      const url = urls.get(product.barcode);
      if (!url) return;
      const { cover, problem } = await downloadCover(url);
      const extension = cover ? EXTENSIONS[cover.type] : undefined;
      if (!cover || !extension) {
        problems.push(`indirme ${problem || `desteklenmeyen tür ${cover?.type}`}`);
        return;
      }
      const key = `urunler/${product.id}/${randomUUID()}.${extension}`;
      const stored = await uploadObject(config, key, cover.bytes, cover.type);
      await db.productImage.create({ data: { productId: product.id, url: stored, sortOrder: 0 } });
      added++;
    }),
  );

  if (added > 0) updateTag(CATALOG_TAG);
  return {
    error: "",
    scanned: products.length,
    added,
    found: urls.size,
    problems,
    cursor: products.length < BATCH ? null : products[products.length - 1].id,
  };
}

