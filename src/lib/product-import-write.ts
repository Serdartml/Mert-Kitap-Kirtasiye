import { Prisma } from "@prisma/client";
import type { CategoryTarget, ImportPlan } from "./product-import";
import { foldTr } from "./search-fold";
import { slugify } from "./slug";

// İçe aktarma planını veritabanına yazar (actions/product-import.ts bir işlem içinde çağırır). Ayrı dosyada, çünkü
// "server-only" ve oturum kontrolü içermez; betikten de (ör. geri alınan deneme yazımı) çağrılabilir.

function uniqueSlug(name: string, used: Set<string>): string {
  const base = slugify(name) || "kategori";
  let slug = base;
  for (let counter = 2; used.has(slug); counter++) slug = `${base.slice(0, 74)}-${counter}`;
  used.add(slug);
  return slug;
}

const chunks = <T>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

export async function writePlan(tx: Prisma.TransactionClient, plan: ImportPlan): Promise<{ newCategoryCount: number }> {
  // 1) Kategoriler: yol ("Ana > Alt") ile bulunur ya da oluşturulur. Yeni kategori sayısı azdır (onlarca), tek tek yazılır.
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

  // 2) Markalar: binlerce olabilir; her biri ayrı sorgu olursa uzak veritabanında işlem süresini aşar, bu yüzden toplu yazılır.
  const brandRows = await tx.brand.findMany({ select: { id: true, name: true, slug: true } });
  const brandSlugs = new Set(brandRows.map((brand) => brand.slug));
  const brandIds = new Map(brandRows.map((brand) => [foldTr(brand.name), brand.id]));
  const newBrandData = plan.newBrands.map((name) => ({ name, slug: uniqueSlug(name, brandSlugs) }));
  for (const part of chunks(newBrandData, 500)) {
    const inserted = await tx.brand.createManyAndReturn({ data: part, select: { id: true, name: true } });
    for (const brand of inserted) brandIds.set(foldTr(brand.name), brand.id);
  }
  const brandId = (name: string | null) => (name ? (brandIds.get(foldTr(name)) ?? null) : null);

  // 3) Yeni ürünler.
  const categoryCache = new Map<string, string>();
  const categoryFor = async (target: CategoryTarget) => {
    if ("id" in target) return target.id;
    const key = target.path.join(">");
    const cached = categoryCache.get(key);
    if (cached) return cached;
    const id = await resolveCategory(target);
    categoryCache.set(key, id);
    return id;
  };
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
      costKurus: create.costKurus,
      stock: create.stock,
      isActive: create.isActive,
      categoryId: await categoryFor(create.category),
      brandId: brandId(create.brandName),
    });
  }
  for (const part of chunks(createData, 1000)) await tx.product.createMany({ data: part });

  // 4) Güncellemeler: tek SQL ile yüzlerce satır (satır satır güncelleme 10 bin üründe zaman aşımına düşerdi).
  for (const part of chunks(plan.updates, 500)) {
    const values: Prisma.Sql[] = [];
    for (const update of part) {
      const categoryId = await categoryFor(update.category);
      const brand = update.brandName ? brandId(update.brandName) : update.brandId;
      values.push(
        Prisma.sql`(${update.id}::text, ${update.name}::text, ${update.description}::text, ${update.priceKurus}::int, ${update.compareAtKurus}::int, ${update.costKurus}::int, ${update.stock}::int, ${update.isActive}::boolean, ${categoryId}::text, ${brand}::text, ${update.barcode}::text)`,
      );
    }
    await tx.$executeRaw`
      UPDATE "Product" AS p SET
        "name" = v."name", "description" = v."description", "priceKurus" = v."priceKurus",
        "compareAtKurus" = v."compareAtKurus", "costKurus" = v."costKurus", "stock" = v."stock", "isActive" = v."isActive",
        "categoryId" = v."categoryId", "brandId" = v."brandId", "barcode" = v."barcode", "updatedAt" = now()
      FROM (VALUES ${Prisma.join(values)}) AS v("id", "name", "description", "priceKurus", "compareAtKurus", "costKurus", "stock", "isActive", "categoryId", "brandId", "barcode")
      WHERE p."id" = v."id"`;
  }
  return { newCategoryCount };
}
