"use server";

import { readSheet } from "read-excel-file/node";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { writePlan } from "@/lib/product-import-write";
import { readTurnaRows } from "@/lib/turna-catalog";
import { isTurnaExport, planWeeklyImport, type WeeklyPlan, type WeeklyStats } from "@/lib/weekly-import";

// Haftalık Turna dosyası. Önizleme hiçbir şey yazmaz; uygulama dosyayı yeniden okuyup planı güncel katalogla çıkarır
// ve tek işlemde yazar.

const MAX_FILE_BYTES = 4_000_000;
const MAX_ROWS = 60_000;
const SAMPLE_LIMIT = 8;
const STILL_IN_STORE = ["PENDING", "PAID", "PREPARING", "SHIPPED"] as const;

export type WeeklyPreview =
  | { ok: false; error: string }
  | { ok: true; stats: WeeklyStats; sampleCreates: { sku: string; name: string; priceKurus: number; stock: number }[]; sampleUpdates: { sku: string; name: string; changes: string[] }[]; newCategories: string[] };

export type WeeklyApply = { ok: false; error: string } | { ok: true; stats: WeeklyStats };

async function buildPlan(formData: FormData): Promise<WeeklyPlan | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Turna'dan aldığınız Excel dosyasını seçin." };
  if (file.size > MAX_FILE_BYTES) return { error: "Dosya çok büyük (en fazla 4 MB)." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Yalnızca .xlsx dosyaları yüklenebilir. Eski .xls ise Excel'de .xlsx olarak kaydedin." };

  let data: unknown[][];
  try {
    data = (await readSheet(Buffer.from(await file.arrayBuffer()))) as unknown[][];
  } catch {
    return { error: "Dosya okunamadı. Geçerli bir .xlsx dosyası olduğundan emin olun." };
  }
  if (data.length > MAX_ROWS) return { error: `Dosyada en fazla ${MAX_ROWS} satır olabilir.` };
  if (!isTurnaExport(data)) return { error: "Bu dosya Turna stok dökümüne benzemiyor (B sütununda ITM ile başlayan kodlar bulunamadı). Hiçbir şey değiştirilmedi." };

  const [existing, excluded, categories, brands, reservedRows] = await Promise.all([
    db.product.findMany({
      select: { id: true, sku: true, barcode: true, slug: true, name: true, description: true, priceKurus: true, compareAtKurus: true, costKurus: true, sourcePriceKurus: true, stock: true, isActive: true, categoryId: true, brandId: true },
    }),
    db.excludedProduct.findMany({ select: { sku: true, barcode: true } }),
    db.category.findMany({ select: { id: true, name: true, parentId: true } }),
    db.brand.findMany({ select: { id: true, name: true } }),
    db.orderItem.groupBy({ by: ["productId"], where: { productId: { not: null }, order: { status: { in: [...STILL_IN_STORE] } } }, _sum: { quantity: true } }),
  ]);
  const reserved = new Map(reservedRows.flatMap((row) => (row.productId ? [[row.productId, row._sum.quantity ?? 0] as const] : [])));
  return planWeeklyImport({ items: readTurnaRows(data), existing, excluded, categories, brands, reserved, zeroMissing: formData.get("zeroMissing") === "1" });
}

export async function previewWeeklyImport(formData: FormData): Promise<WeeklyPreview> {
  await requireAdmin();
  const result = await buildPlan(formData);
  if ("error" in result) return { ok: false, error: result.error };
  const { plan, stats } = result;
  return {
    ok: true,
    stats,
    sampleCreates: plan.creates.slice(0, SAMPLE_LIMIT).map((item) => ({ sku: item.sku, name: item.name, priceKurus: item.priceKurus, stock: item.stock })),
    sampleUpdates: plan.updates.filter((item) => item.changes.length > 0).slice(0, SAMPLE_LIMIT).map((item) => ({ sku: item.sku, name: item.name, changes: item.changes })),
    newCategories: plan.newCategories.map((item) => `${item.path.join(" > ")} (${item.rows})`),
  };
}

export async function applyWeeklyImport(formData: FormData): Promise<WeeklyApply> {
  await requireAdmin();
  const result = await buildPlan(formData);
  if ("error" in result) return { ok: false, error: result.error };
  const { plan, stats } = result;
  if (plan.creates.length === 0 && plan.updates.length === 0) return { ok: true, stats };

  try {
    await db.$transaction((tx) => writePlan(tx, plan), { timeout: 55_000, maxWait: 10_000 });
    updateTag(CATALOG_TAG);
    return { ok: true, stats };
  } catch (error) {
    console.error("[haftalık stok] Uygulanamadı:", error);
    return { ok: false, error: "Aktarım sırasında bir hata oluştu; hiçbir değişiklik yapılmadı. Yeniden deneyin." };
  }
}
