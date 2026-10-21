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
  // Sonraki çağrıda verilecek imleç; null ise taranacak ürün kalmadı.
  cursor: string | null;
}

// Görseli olmayan ISBN barkodlu ürünler için sıradaki grubun kapağını bulup R2'ye kopyalar, ürüne tek görsel olarak ekler.
export async function fetchBarcodeCovers(cursor: string): Promise<CoverBatchResult> {
  await requireAdmin();

  const config = r2Config();
  if (!config) return { error: "Görsel depolama (Cloudflare R2) bağlı değil.", scanned: 0, added: 0, cursor: null };

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
  if (products.length === 0) return { error: "", scanned: 0, added: 0, cursor: null };

  const withIsbn = products.filter((product): product is { id: string; barcode: string } => !!product.barcode && isIsbn13(product.barcode));
  const urls = await lookupCoverUrls(withIsbn.map((product) => product.barcode));

  let added = 0;
  await Promise.all(
    withIsbn.map(async (product) => {
      const url = urls.get(product.barcode);
      const cover = url ? await downloadCover(url) : null;
      const extension = cover ? EXTENSIONS[cover.type] : undefined;
      if (!cover || !extension) return;
      const key = `urunler/${product.id}/${randomUUID()}.${extension}`;
      const stored = await uploadObject(config, key, cover.bytes, cover.type);
      await db.productImage.create({ data: { productId: product.id, url: stored, sortOrder: 0 } });
      added++;
    }),
  );

  if (added > 0) updateTag(CATALOG_TAG);
  return { error: "", scanned: products.length, added, cursor: products.length < BATCH ? null : products[products.length - 1].id };
}
