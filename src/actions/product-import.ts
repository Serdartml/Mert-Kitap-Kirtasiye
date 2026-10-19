"use server";

import { Prisma } from "@prisma/client";
import { readSheet } from "read-excel-file/node";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import {
  detectMapping,
  IMPORT_FIELDS,
  missingFields,
  parseRows,
  planImport,
  type CategoryTarget,
  type FieldKey,
  type ImportMode,
  type ImportOptions,
  type ImportPlan,
  type Mapping,
  type RowIssue,
} from "@/lib/product-import";
import { foldTr } from "@/lib/search-fold";
import { slugify } from "@/lib/slug";

// Excel'den ürün içe aktarma (yönetim). Önizleme hiçbir şey yazmaz; uygulama dosyayı yeniden okuyup planı güncel
// katalogla yeniden çıkarır ve tek işlemde yazar (bir hata olursa hiçbir değişiklik kalmaz). Sunucu action'ları
// formdan değil istemci kodundan çağrılır; böylece seçili dosya önizleme ile uygulama arasında kaybolmaz.

const MAX_FILE_BYTES = 4_000_000;
const MAX_ROWS = 50_000;
const ERROR_LIST_LIMIT = 100;
const SAMPLE_LIMIT = 8;
const STILL_IN_STORE = ["PENDING", "PAID", "PREPARING", "SHIPPED"] as const;

export interface ImportSummary {
  creates: number;
  updates: number;
  unchanged: number;
  errorCount: number;
  errors: RowIssue[];
  warningCount: number;
  warnings: RowIssue[];
  newCategories: { path: string[]; rows: number }[];
  newBrands: string[];
  sampleCreates: { sku: string; name: string; priceKurus: number; stock: number; category: string }[];
  sampleUpdates: { sku: string; name: string; changes: string[] }[];
}

export type PreviewResult =
  | { ok: false; error: string }
  | { ok: true; headers: string[]; mapping: Mapping; missing: string[]; rowCount: number; summary: ImportSummary | null };

export type ApplyResult =
  | { ok: false; error: string }
  | { ok: true; created: number; updated: number; unchanged: number; skipped: number; newCategories: number; newBrands: number };

interface Loaded {
  headers: string[];
  mapping: Mapping;
  options: ImportOptions;
  data: unknown[][];
}

async function load(formData: FormData): Promise<Loaded | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bir Excel dosyası seçin." };
  if (file.size > MAX_FILE_BYTES) return { error: "Dosya çok büyük (en fazla 4 MB). Ürünleri birkaç dosyaya bölün." };
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) return { error: "Eski .xls biçimi desteklenmiyor. Excel'de “Farklı Kaydet” ile .xlsx olarak kaydedip yükleyin." };
  if (!name.endsWith(".xlsx")) return { error: "Yalnızca .xlsx (Excel) dosyaları yüklenebilir." };

  let data: unknown[][];
  try {
    data = (await readSheet(Buffer.from(await file.arrayBuffer()))) as unknown[][];
  } catch {
    return { error: "Dosya okunamadı. Geçerli bir .xlsx dosyası olduğundan emin olun." };
  }
  if (data.length < 2) return { error: "Dosyada başlık satırından sonra veri yok." };
  if (data.length > MAX_ROWS) return { error: `Dosyada en fazla ${MAX_ROWS} satır olabilir.` };

  const headers = (data[0] ?? []).map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim()));

  // Elle seçilen eşleme (JSON: alan -> sütun sırası); yoksa başlıklardan tahmin edilir.
  let mapping: Mapping = detectMapping(headers);
  const mappingText = String(formData.get("mapping") ?? "");
  if (mappingText) {
    try {
      const raw = JSON.parse(mappingText) as Record<string, unknown>;
      mapping = {};
      for (const field of IMPORT_FIELDS) {
        const column = raw[field.key];
        if (typeof column === "number" && Number.isInteger(column) && column >= 0 && column < headers.length) mapping[field.key as FieldKey] = column;
      }
    } catch {
      return { error: "Sütun eşlemesi okunamadı." };
    }
  }

  const vat = Number(String(formData.get("vat") ?? "").replace(",", "."));
  const options: ImportOptions = {
    mode: formData.get("mode") === "stok" ? "stok" : ("tam" satisfies ImportMode),
    vatPercent: Number.isFinite(vat) && vat > 0 && vat <= 100 ? vat : null,
    createCategories: formData.get("createCategories") === "1",
    subtractReserved: formData.get("subtractReserved") !== "0",
  };
  return { headers, mapping, options, data };
}

// Dosya satırlarını güncel katalogla karşılaştırır.
async function buildPlan({ data, mapping, options }: Loaded): Promise<ImportPlan> {
  const parsed = parseRows(data, mapping, options);
  const [existing, categories, brands, reservedRows] = await Promise.all([
    db.product.findMany({
      select: { id: true, sku: true, barcode: true, slug: true, name: true, description: true, priceKurus: true, compareAtKurus: true, stock: true, isActive: true, categoryId: true, brandId: true },
    }),
    db.category.findMany({ select: { id: true, name: true, parentId: true } }),
    db.brand.findMany({ select: { id: true, name: true } }),
    options.subtractReserved
      ? db.orderItem.groupBy({
          by: ["productId"],
          where: { productId: { not: null }, order: { status: { in: [...STILL_IN_STORE] } } },
          _sum: { quantity: true },
        })
      : Promise.resolve([]),
  ]);
  const reserved = new Map(reservedRows.flatMap((row) => (row.productId ? [[row.productId, row._sum.quantity ?? 0] as const] : [])));
  return planImport({ rows: parsed.rows, existing, categories, brands, reserved, options }, parsed.errors, parsed.warnings);
}

export async function previewImport(formData: FormData): Promise<PreviewResult> {
  await requireAdmin();

  const loaded = await load(formData);
  if ("error" in loaded) return { ok: false, error: loaded.error };

  const missing = missingFields(loaded.mapping, loaded.options.mode);
  const base = { ok: true as const, headers: loaded.headers, mapping: loaded.mapping, missing, rowCount: loaded.data.length - 1 };
  if (missing.length > 0) return { ...base, summary: null };

  const plan = await buildPlan(loaded);
  const categoryNames = new Map((await db.category.findMany({ select: { id: true, name: true } })).map((category) => [category.id, category.name]));
  const categoryLabel = (target: CategoryTarget) => ("id" in target ? (categoryNames.get(target.id) ?? "") : `${target.path.join(" > ")} (yeni)`);

  return {
    ...base,
    summary: {
      creates: plan.creates.length,
      updates: plan.updates.length,
      unchanged: plan.unchanged,
      errorCount: plan.errors.length,
      errors: plan.errors.slice(0, ERROR_LIST_LIMIT),
      warningCount: plan.warnings.length,
      warnings: plan.warnings.slice(0, 20),
      newCategories: plan.newCategories,
      newBrands: plan.newBrands,
      sampleCreates: plan.creates.slice(0, SAMPLE_LIMIT).map((create) => ({ sku: create.sku, name: create.name, priceKurus: create.priceKurus, stock: create.stock, category: categoryLabel(create.category) })),
      sampleUpdates: plan.updates.slice(0, SAMPLE_LIMIT).map((update) => ({ sku: update.sku, name: update.name, changes: update.changes })),
    },
  };
}

function uniqueSlug(name: string, used: Set<string>): string {
  const base = slugify(name) || "kategori";
  let slug = base;
  for (let counter = 2; used.has(slug); counter++) slug = `${base.slice(0, 74)}-${counter}`;
  used.add(slug);
  return slug;
}

const chunks = <T>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

export async function applyImport(formData: FormData): Promise<ApplyResult> {
  await requireAdmin();

  const loaded = await load(formData);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  if (missingFields(loaded.mapping, loaded.options.mode).length > 0) return { ok: false, error: "Zorunlu sütunlar eşlenmemiş." };

  const plan = await buildPlan(loaded);
  if (plan.creates.length === 0 && plan.updates.length === 0) {
    return { ok: true, created: 0, updated: 0, unchanged: plan.unchanged, skipped: plan.errors.length, newCategories: 0, newBrands: 0 };
  }

  try {
    const counts = await db.$transaction(
      async (tx) => {
        // 1) Kategoriler: yol ("Ana > Alt") ile bulunur ya da oluşturulur.
        const allCategories = await tx.category.findMany({ select: { id: true, name: true, parentId: true, slug: true, sortOrder: true } });
        const categorySlugs = new Set(allCategories.map((category) => category.slug));
        let sortOrder = allCategories.reduce((max, category) => Math.max(max, category.sortOrder), 0);
        const created = new Map<string, string>();
        let newCategoryCount = 0;

        const ensure = async (name: string, parentId: string | null): Promise<string> => {
          const key = `${parentId ?? ""}|${foldTr(name)}`;
          const known = created.get(key) ?? allCategories.find((category) => category.parentId === parentId && foldTr(category.name) === foldTr(name))?.id;
          if (known) return known;
          const category = await tx.category.create({ data: { name, slug: uniqueSlug(name, categorySlugs), parentId, sortOrder: ++sortOrder }, select: { id: true } });
          created.set(key, category.id);
          newCategoryCount++;
          return category.id;
        };
        const resolveCategory = async (target: CategoryTarget): Promise<string> => {
          if ("id" in target) return target.id;
          const rootId = await ensure(target.path[0], null);
          return target.path.length === 2 ? ensure(target.path[1], rootId) : rootId;
        };

        // 2) Markalar.
        const brandRows = await tx.brand.findMany({ select: { id: true, name: true, slug: true } });
        const brandSlugs = new Set(brandRows.map((brand) => brand.slug));
        const brandIds = new Map(brandRows.map((brand) => [foldTr(brand.name), brand.id]));
        for (const name of plan.newBrands) {
          const brand = await tx.brand.create({ data: { name, slug: uniqueSlug(name, brandSlugs) }, select: { id: true } });
          brandIds.set(foldTr(name), brand.id);
        }
        const brandId = (name: string | null) => (name ? (brandIds.get(foldTr(name)) ?? null) : null);

        // 3) Yeni ürünler.
        const createData: Prisma.ProductCreateManyInput[] = [];
        for (const create of plan.creates) {
          createData.push({
            sku: create.sku,
            barcode: create.barcode,
            name: create.name,
            slug: create.slug,
            description: create.description,
            priceKurus: create.priceKurus,
            compareAtKurus: create.compareAtKurus,
            stock: create.stock,
            isActive: create.isActive,
            categoryId: await resolveCategory(create.category),
            brandId: brandId(create.brandName),
          });
        }
        for (const part of chunks(createData, 1000)) await tx.product.createMany({ data: part });

        // 4) Güncellemeler: tek SQL ile yüzlerce satır (satır satır güncelleme 10 bin üründe zaman aşımına düşerdi).
        for (const part of chunks(plan.updates, 500)) {
          const values: Prisma.Sql[] = [];
          for (const update of part) {
            const categoryId = await resolveCategory(update.category);
            const brand = update.brandName ? brandId(update.brandName) : update.brandId;
            values.push(
              Prisma.sql`(${update.id}::text, ${update.name}::text, ${update.description}::text, ${update.priceKurus}::int, ${update.compareAtKurus}::int, ${update.stock}::int, ${update.isActive}::boolean, ${categoryId}::text, ${brand}::text, ${update.barcode}::text)`,
            );
          }
          await tx.$executeRaw`
            UPDATE "Product" AS p SET
              "name" = v."name", "description" = v."description", "priceKurus" = v."priceKurus",
              "compareAtKurus" = v."compareAtKurus", "stock" = v."stock", "isActive" = v."isActive",
              "categoryId" = v."categoryId", "brandId" = v."brandId", "barcode" = v."barcode", "updatedAt" = now()
            FROM (VALUES ${Prisma.join(values)}) AS v("id", "name", "description", "priceKurus", "compareAtKurus", "stock", "isActive", "categoryId", "brandId", "barcode")
            WHERE p."id" = v."id"`;
        }
        return { newCategoryCount };
      },
      { timeout: 55_000, maxWait: 10_000 },
    );

    updateTag(CATALOG_TAG);
    return {
      ok: true,
      created: plan.creates.length,
      updated: plan.updates.length,
      unchanged: plan.unchanged,
      skipped: plan.errors.length,
      newCategories: counts.newCategoryCount,
      newBrands: plan.newBrands.length,
    };
  } catch (error) {
    console.error("[ürün içe aktarma] Uygulanamadı:", error);
    return { ok: false, error: "Aktarım sırasında bir hata oluştu; hiçbir değişiklik yapılmadı. Dosyayı kontrol edip yeniden deneyin." };
  }
}
