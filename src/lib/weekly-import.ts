import { generateDescription } from "./product-description";
import { reconcilePrice, type BrandRef, type CategoryRef, type CategoryTarget, type ExistingProduct, type ImportPlan, type PlannedCreate, type PlannedUpdate } from "./product-import";
import { foldTr } from "./search-fold";
import { slugify } from "./slug";
import { agendaIsOutdated, buildBrandNames, editionOf, notForSaleReason, parseName, type TurnaItem } from "./turna-catalog";
import { classify, learnProductBrands, learnPublishers } from "./turna-categories";

// Haftalık Turna stok dosyası (başlıksız .xlsx). Saf mantık; okuma/yazma actions/weekly-import.ts içindedir.
// - Sitedeki ürün: yalnızca stok, fiyat ve alış fiyatı güncellenir; ad, kategori, açıklama, görsel korunur, indirim korunur.
// - Siteden çıkarılmış ürün (ExcludedProduct): yeniden eklenmez.
// - Yeni ürün: satışa uygunsa kategori, marka ve açıklamasıyla eklenir.

export function isTurnaExport(data: unknown[][]): boolean {
  const sample = data.filter((row) => row?.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")).slice(0, 200);
  if (sample.length === 0) return false;
  const coded = sample.filter((row) => /^ITM/i.test(String(row[1] ?? "").trim())).length;
  return coded / sample.length >= 0.6;
}

export interface WeeklyStats {
  priceChanged: number;
  stockChanged: number;
  discountKept: number;
  created: number;
  unchanged: number;
  excluded: number;
  notForSale: number;
  oldEdition: number;
  undatedPrep: number;
  duplicates: number;
  invalid: number;
  // Sitede stoklu olup dosyada hiç geçmeyen ürünler.
  missingFromFile: number;
}

export interface WeeklyPlan {
  plan: ImportPlan;
  stats: WeeklyStats;
}

export interface WeeklyInput {
  items: TurnaItem[];
  existing: ExistingProduct[];
  excluded: { sku: string; barcode: string | null }[];
  categories: CategoryRef[];
  brands: BrandRef[];
  // Ürün id -> açık siparişlerin ayırdığı adet (Turna'dan henüz düşmemiştir).
  reserved: Map<string, number>;
  // Dosyada olmayan ürünlerin stoğu sıfırlansın mı.
  zeroMissing: boolean;
}

export function planWeeklyImport({ items, existing, excluded, categories, brands, reserved, zeroMissing }: WeeklyInput): WeeklyPlan {
  const stats: WeeklyStats = { priceChanged: 0, stockChanged: 0, discountKept: 0, created: 0, unchanged: 0, excluded: 0, notForSale: 0, oldEdition: 0, undatedPrep: 0, duplicates: 0, invalid: 0, missingFromFile: 0 };
  const updates: PlannedUpdate[] = [];
  const creates: PlannedCreate[] = [];

  const bySku = new Map(existing.map((product) => [product.sku, product]));
  const byBarcode = new Map(existing.flatMap((product) => (product.barcode ? [[product.barcode, product] as const] : [])));
  const excludedSkus = new Set(excluded.map((item) => item.sku));
  const excludedBarcodes = new Set(excluded.flatMap((item) => (item.barcode ? [item.barcode] : [])));
  const usedSlugs = new Set(existing.map((product) => product.slug));
  const usedBarcodes = new Set(byBarcode.keys());
  const seenCodes = new Set<string>();
  const seenProducts = new Set<string>();

  // Marka ve kategori sezgileri tüm dosyadan öğrenilir (turna-hazirla.ts ile aynı).
  const sellable = items.filter((item) => !notForSaleReason(item)).map((item) => ({ item, parsed: parseName(item.name) }));
  const signals = {
    publishers: learnPublishers(sellable.map(({ item, parsed }) => ({ brand: parsed.brand, vat: item.vat }))),
    productBrands: learnProductBrands(sellable.map(({ item, parsed }) => ({ brand: parsed.brand, name: item.name }))),
  };
  const brandNames = buildBrandNames(sellable.flatMap(({ parsed }) => (parsed.brand ? [parsed.brand] : [])));
  const knownBrands = new Set(brands.map((brand) => foldTr(brand.name)));
  const newBrands = new Map<string, string>();
  const newCategories = new Map<string, { path: string[]; rows: number }>();

  const roots = categories.filter((category) => !category.parentId);
  const resolveCategory = (path: string[]): CategoryTarget => {
    const root = roots.find((category) => foldTr(category.name) === foldTr(path[0]));
    const child = root && path[1] ? categories.find((category) => category.parentId === root.id && foldTr(category.name) === foldTr(path[1])) : undefined;
    if (child) return { id: child.id };
    if (root && !path[1]) return { id: root.id };
    const key = path.map(foldTr).join(">");
    const entry = newCategories.get(key);
    if (entry) entry.rows++;
    else newCategories.set(key, { path, rows: 1 });
    return { path };
  };
  const takeSlug = (name: string, sku: string) => {
    const base = slugify(name) || slugify(sku) || "urun";
    let slug = base;
    if (usedSlugs.has(slug)) slug = `${base.slice(0, 70)}-${slugify(sku)}`.slice(0, 80);
    for (let counter = 2; usedSlugs.has(slug); counter++) slug = `${base.slice(0, 74)}-${counter}`;
    usedSlugs.add(slug);
    return slug;
  };

  for (const item of items) {
    const key = item.code || `barkod:${item.barcode}`;
    if (seenCodes.has(key)) {
      stats.duplicates++;
      continue;
    }
    seenCodes.add(key);

    const found = (item.code ? bySku.get(item.code) : undefined) ?? (item.barcode ? byBarcode.get(item.barcode) : undefined);
    if (found) {
      if (seenProducts.has(found.id)) {
        stats.duplicates++;
        continue;
      }
      seenProducts.add(found.id);
      const stock = Math.max(0, Math.floor(item.stock) - (reserved.get(found.id) ?? 0));
      const costKurus = item.costKurus > 0 ? item.costKurus : found.costKurus;
      const priced = item.priceKurus > 0 ? reconcilePrice(found, item.priceKurus, costKurus) : { priceKurus: found.priceKurus, compareAtKurus: found.compareAtKurus };
      const sourcePriceKurus = item.priceKurus > 0 ? item.priceKurus : (found.sourcePriceKurus ?? null);

      const changes: string[] = [];
      if (stock !== found.stock) {
        changes.push(`stok ${found.stock} → ${stock}`);
        stats.stockChanged++;
      }
      if (priced.priceKurus !== found.priceKurus || priced.compareAtKurus !== found.compareAtKurus) {
        changes.push(`fiyat ${found.priceKurus / 100} → ${priced.priceKurus / 100}`);
        stats.priceChanged++;
      }
      if (costKurus !== found.costKurus) changes.push("alış fiyatı");
      if (found.compareAtKurus !== null && priced.compareAtKurus !== null) stats.discountKept++;

      // Yalnızca son dosya fiyatı değiştiyse de yazılır (sonraki haftanın karşılaştırması için), ama "güncel" sayılır.
      if (changes.length === 0) stats.unchanged++;
      if (changes.length > 0 || sourcePriceKurus !== (found.sourcePriceKurus ?? null)) {
        updates.push({
          line: item.line, id: found.id, sku: found.sku, barcode: found.barcode, name: found.name, description: found.description,
          priceKurus: priced.priceKurus, compareAtKurus: priced.compareAtKurus, costKurus, sourcePriceKurus, stock, isActive: found.isActive,
          category: { id: found.categoryId }, brandName: null, brandId: found.brandId, changes,
        });
      }
      continue;
    }

    if ((item.code && excludedSkus.has(item.code)) || (item.barcode && excludedBarcodes.has(item.barcode))) {
      stats.excluded++;
      continue;
    }
    if (notForSaleReason(item)) {
      stats.notForSale++;
      continue;
    }
    if (!item.code) {
      stats.invalid++;
      continue;
    }

    const parsed = parseName(item.name);
    const categoryText = classify(item, parsed, signals).category ?? "Kırtasiye > Diğer Ürünler";
    if (categoryText.startsWith("Hazırlık Kitapları")) {
      const edition = editionOf(item.name);
      if (edition === "eski") {
        stats.oldEdition++;
        continue;
      }
      if (edition === "tarihsiz") {
        stats.undatedPrep++;
        continue;
      }
    }
    if ((categoryText.includes("Ajanda") || /ajanda|takvim/.test(foldTr(item.name))) && agendaIsOutdated(item.name)) {
      stats.oldEdition++;
      continue;
    }

    const name = parsed.title.slice(0, 200);
    const path = categoryText.split(">").map((part) => part.trim());
    const brandName = parsed.brand ? (brandNames.get(foldTr(parsed.brand)) ?? parsed.brand) : null;
    if (brandName && !knownBrands.has(foldTr(brandName))) newBrands.set(foldTr(brandName), brandName);
    const barcode = item.barcode && !usedBarcodes.has(item.barcode) ? item.barcode : null;
    if (barcode) usedBarcodes.add(barcode);
    creates.push({
      line: item.line, sku: item.code, barcode, name, slug: takeSlug(name, item.code),
      description: generateDescription({ name, root: path[0], sub: path[1] ?? null }),
      priceKurus: item.priceKurus, compareAtKurus: null, costKurus: item.costKurus > 0 ? item.costKurus : null, sourcePriceKurus: item.priceKurus,
      stock: Math.max(0, Math.floor(item.stock)), isActive: true, category: resolveCategory(path), brandName,
    });
    stats.created++;
  }

  for (const product of existing) {
    if (seenProducts.has(product.id) || product.stock <= 0) continue;
    stats.missingFromFile++;
    if (zeroMissing) {
      updates.push({
        line: 0, id: product.id, sku: product.sku, barcode: product.barcode, name: product.name, description: product.description,
        priceKurus: product.priceKurus, compareAtKurus: product.compareAtKurus, costKurus: product.costKurus, sourcePriceKurus: product.sourcePriceKurus ?? null,
        stock: 0, isActive: product.isActive, category: { id: product.categoryId }, brandName: null, brandId: product.brandId, changes: [`stok ${product.stock} → 0 (dosyada yok)`],
      });
      stats.stockChanged++;
    }
  }

  return {
    plan: { creates, updates, unchanged: stats.unchanged, errors: [], warnings: [], newCategories: [...newCategories.values()], newBrands: [...newBrands.values()] },
    stats,
  };
}
