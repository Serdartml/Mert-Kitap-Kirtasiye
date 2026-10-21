"use server";

import { randomUUID } from "node:crypto";
import { Prisma, type OrderStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { brandBackQuery } from "@/lib/admin-brands";
import { isProductFilter, productListWhere } from "@/lib/admin-products";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { orderStatusMail } from "@/lib/mail-templates";
import { closedStatuses, nextStatuses } from "@/lib/order-status";
import { deleteObject, keyFromUrl, r2Config, uploadObject } from "@/lib/r2";
import { parsePriceToKurus, slugify } from "@/lib/slug";

// Bu dosyadaki her action önce requireAdmin() çağırır: action'lar doğrudan POST ile de çağrılabilir.
// Katalogu değiştiren her action sonunda updateTag(CATALOG_TAG) ile mağaza önbelleğini hemen boşaltır.

export interface FormState {
  error: string;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function uniqueError(error: unknown, labels: Record<string, string>): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String((error.meta?.target as string[] | string | undefined) ?? "");
    const field = Object.keys(labels).find((key) => target.includes(key));
    return `Bu ${field ? labels[field] : "değer"} başka bir kayıtta kullanılıyor.`;
  }
  return null;
}

// ---------- Ürünler ----------

const productSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalı.").max(200),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Adres yalnızca küçük harf, rakam ve tire içerebilir.").max(80),
  sku: z.string().min(1, "Stok kodu zorunlu.").max(60),
  barcode: z.string().max(40),
  description: z.string().max(5000),
  stock: z.coerce.number().int("Stok tam sayı olmalı.").min(0, "Stok eksi olamaz.").max(1_000_000),
  categoryId: z.string().min(1, "Kategori seçin."),
});

// Özellikler alanı: her satır "Ad: Değer".
function parseAttributes(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, sortOrder) => {
      const index = line.indexOf(":");
      if (index < 1) return null;
      const name = line.slice(0, index).trim().slice(0, 60);
      const value = line.slice(index + 1).trim().slice(0, 200);
      return name && value ? { name, value, sortOrder } : null;
    });
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = text(formData, "id");
  const name = text(formData, "name");
  const parsed = productSchema.safeParse({
    name,
    slug: text(formData, "slug") || slugify(name),
    sku: text(formData, "sku"),
    barcode: text(formData, "barcode"),
    description: text(formData, "description"),
    stock: text(formData, "stock") || "0",
    categoryId: text(formData, "categoryId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const priceKurus = parsePriceToKurus(text(formData, "price"));
  if (priceKurus == null || priceKurus <= 0) return { error: "Geçerli bir fiyat yazın (örnek: 449,90)." };

  const compareRaw = text(formData, "compareAt");
  const compareAtKurus = compareRaw ? parsePriceToKurus(compareRaw) : null;
  if (compareRaw && compareAtKurus == null) return { error: "Eski fiyat geçerli değil (örnek: 549,90)." };
  if (compareAtKurus != null && compareAtKurus <= priceKurus) {
    return { error: "Eski fiyat, satış fiyatından yüksek olmalı; indirim yoksa boş bırakın." };
  }

  const costRaw = text(formData, "cost");
  const costKurus = costRaw ? parsePriceToKurus(costRaw) : null;
  if (costRaw && costKurus == null) return { error: "Alış fiyatı geçerli değil (örnek: 249,90)." };

  const attributes = parseAttributes(text(formData, "attributes"));
  if (attributes.some((attribute) => attribute === null)) {
    return { error: 'Özellikler her satırda "Ad: Değer" biçiminde olmalı.' };
  }
  const attributeRows = attributes.filter((attribute) => attribute !== null);

  const brandId = text(formData, "brandId") || null;
  if (brandId && !(await db.brand.findUnique({ where: { id: brandId }, select: { id: true } }))) {
    return { error: "Marka bulunamadı." };
  }

  const { barcode, description, ...rest } = parsed.data;
  const data = {
    ...rest,
    brandId,
    barcode: barcode || null,
    description: description || null,
    priceKurus,
    compareAtKurus,
    costKurus,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  };

  try {
    await db.$transaction(async (tx) => {
      const product = id
        ? await tx.product.update({ where: { id }, data })
        : await tx.product.create({ data });
      await tx.productAttribute.deleteMany({ where: { productId: product.id } });
      if (attributeRows.length > 0) {
        await tx.productAttribute.createMany({
          data: attributeRows.map((attribute) => ({ ...attribute, productId: product.id })),
        });
      }
    });
  } catch (error) {
    const message = uniqueError(error, { slug: "adres", sku: "stok kodu", barcode: "barkod" });
    if (message) return { error: message };
    throw error;
  }

  updateTag(CATALOG_TAG);
  redirect("/yonetim/urunler?durum=kaydedildi");
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdmin();
  // Sipariş kalemleri ürüne bağlıysa bağ kopar (şemada SetNull), sipariş kaydı bozulmaz.
  await db.product.delete({ where: { id } });
  updateTag(CATALOG_TAG);
  redirect("/yonetim/urunler?durum=silindi");
}

const MAX_BULK_IDS = 5000;

// Toplu işlemin hedefi: seçili kimlikler ("ids") ya da filtreye uyan tüm ürünler (scope=all; aynı q/kategori/filtre ile
// liste koşulu yeniden kurulur).
async function bulkTargetWhere(formData: FormData): Promise<Prisma.ProductWhereInput> {
  if (text(formData, "scope") === "all") {
    const roots = await db.category.findMany({ where: { parentId: null }, select: { id: true, children: { select: { id: true } } } });
    const filter = text(formData, "filtre");
    return productListWhere({ q: text(formData, "q").slice(0, 100), categoryId: text(formData, "kategori"), filter: isProductFilter(filter) ? filter : "" }, roots);
  }
  const ids = [...new Set(formData.getAll("ids").map(String).filter((id) => id.length > 0 && id.length <= 40))];
  if (ids.length === 0) redirect("/yonetim/urunler");
  // Sessizce kırpmak yerine reddedilir: kullanıcı hepsinin işlendiğini sanmasın.
  if (ids.length > MAX_BULK_IDS) redirect("/yonetim/urunler?durum=cok-fazla");
  return { id: { in: ids } };
}

// Ürün listesinden toplu silme. Siparişler korunur: kalemlerin ürün bağı kopar (şemada SetNull).
export async function deleteProducts(formData: FormData): Promise<void> {
  await requireAdmin();
  const where = await bulkTargetWhere(formData);

  const { count } = await db.product.deleteMany({ where });
  updateTag(CATALOG_TAG);
  redirect(`/yonetim/urunler?durum=toplu-silindi&adet=${count}`);
}

// Ürün listesinden toplu öne çıkarma ("islem": one-cikar ya da one-cikarma). İndirim ürün sayfasından tek tek düzenlenir.
export async function editProducts(formData: FormData): Promise<void> {
  await requireAdmin();
  const where = await bulkTargetWhere(formData);
  const featured = text(formData, "islem") === "one-cikar";

  const { count } = await db.product.updateMany({ where, data: { isFeatured: featured } });
  updateTag(CATALOG_TAG);
  redirect(`/yonetim/urunler?durum=${featured ? "one-cikarildi" : "one-cikarilmadi"}&adet=${count}`);
}

// ---------- Ürün görselleri (Cloudflare R2) ----------

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
// Vercel'de istek 4,5 MB'ı aşamaz; tarayıcı görseli yüklemeden önce küçültür (components/admin/ProductImages), bu yalnızca üst sınırdır.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 8;

export async function uploadProductImages(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const productId = text(formData, "productId");
  const config = r2Config();
  if (!config) return { error: "Görsel depolama (Cloudflare R2) henüz bağlı değil. Ortam değişkenlerini girin (.env.example)." };

  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length === 0) return { error: "Önce bir görsel seçin." };
  for (const file of files) {
    if (!IMAGE_TYPES[file.type]) return { error: `${file.name}: yalnızca JPG, PNG, WebP ya da AVIF yüklenebilir.` };
    if (file.size > MAX_IMAGE_BYTES) return { error: `${file.name}: görsel 4 MB'tan büyük.` };
  }

  const existing = await db.productImage.findMany({ where: { productId }, select: { sortOrder: true } });
  if (existing.length + files.length > MAX_IMAGES_PER_PRODUCT) return { error: `Bir ürüne en fazla ${MAX_IMAGES_PER_PRODUCT} görsel eklenebilir.` };
  let sortOrder = existing.reduce((max, image) => Math.max(max, image.sortOrder), -1);

  for (const file of files) {
    const key = `urunler/${productId}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
    const url = await uploadObject(config, key, new Uint8Array(await file.arrayBuffer()), file.type);
    await db.productImage.create({ data: { productId, url, sortOrder: ++sortOrder } });
  }

  updateTag(CATALOG_TAG);
  redirect(`/yonetim/urunler/${productId}?durum=gorsel-eklendi&adet=${files.length}`);
}

export async function deleteProductImage(id: string): Promise<void> {
  await requireAdmin();
  const image = await db.productImage.delete({ where: { id } });
  // Nesne silinemezse (ağ hatası) kayıt yine de gider; artık hiçbir sayfada görünmez, yalnızca depoda yetim dosya kalır.
  const config = r2Config();
  const key = config ? keyFromUrl(config, image.url) : null;
  if (config && key) await deleteObject(config, key).catch(() => undefined);
  updateTag(CATALOG_TAG);
  redirect(`/yonetim/urunler/${image.productId}?durum=gorsel-silindi`);
}

// Seçilen görseli ürünün ilk (kapak) görseli yapar.
export async function setPrimaryProductImage(id: string): Promise<void> {
  await requireAdmin();
  const image = await db.productImage.findUniqueOrThrow({ where: { id } });
  const first = await db.productImage.findFirst({ where: { productId: image.productId }, orderBy: { sortOrder: "asc" } });
  if (first && first.id !== id) await db.productImage.update({ where: { id }, data: { sortOrder: first.sortOrder - 1 } });
  updateTag(CATALOG_TAG);
  redirect(`/yonetim/urunler/${image.productId}?durum=kaydedildi`);
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isActive } });
  updateTag(CATALOG_TAG);
}

// ---------- Kategoriler ----------

const categorySchema = z.object({
  name: z.string().min(2, "Kategori adı en az 2 karakter olmalı.").max(80),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Adres yalnızca küçük harf, rakam ve tire içerebilir.").max(80),
  description: z.string().max(300),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  parentId: z.string(),
});

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = text(formData, "id");
  const name = text(formData, "name");
  const parsed = categorySchema.safeParse({
    name,
    slug: text(formData, "slug") || slugify(name),
    description: text(formData, "description"),
    sortOrder: text(formData, "sortOrder") || "0",
    parentId: text(formData, "parentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const parentId = parsed.data.parentId || null;
  if (parentId) {
    if (parentId === id) return { error: "Kategori kendisinin üst kategorisi olamaz." };
    // Site iki seviye kategoriyle çalışır: üst kategorinin kendisi alt kategori olamaz.
    const parent = await db.category.findUnique({ where: { id: parentId } });
    if (!parent) return { error: "Üst kategori bulunamadı." };
    if (parent.parentId) return { error: "Üst kategori olarak yalnızca ana kategoriler seçilebilir." };
    if (id && (await db.category.count({ where: { parentId: id } })) > 0) {
      return { error: "Alt kategorileri olan bir kategori başka bir kategorinin altına taşınamaz." };
    }
  }

  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    sortOrder: parsed.data.sortOrder,
    parentId,
  };

  try {
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
  } catch (error) {
    const message = uniqueError(error, { slug: "adres" });
    if (message) return { error: message };
    throw error;
  }

  updateTag(CATALOG_TAG);
  redirect("/yonetim/kategoriler?durum=kaydedildi");
}

export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();

  const [products, children] = await Promise.all([
    db.product.count({ where: { categoryId: id } }),
    db.category.count({ where: { parentId: id } }),
  ]);
  // İçinde ürün veya alt kategori olan kategori silinmez; önce taşınmaları gerekir.
  if (products > 0 || children > 0) redirect("/yonetim/kategoriler?durum=dolu");

  await db.category.delete({ where: { id } });
  updateTag(CATALOG_TAG);
  redirect("/yonetim/kategoriler?durum=silindi");
}

// ---------- Markalar ----------

const brandSchema = z.object({
  name: z.string().min(2, "Marka adı en az 2 karakter olmalı.").max(80),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Adres yalnızca küçük harf, rakam ve tire içerebilir.").max(80),
});

export async function saveBrand(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = text(formData, "id");
  const name = text(formData, "name");
  const parsed = brandSchema.safeParse({ name, slug: text(formData, "slug") || slugify(name) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const data = { ...parsed.data, isWholesaler: formData.get("isWholesaler") === "on" };
    if (id) await db.brand.update({ where: { id }, data });
    else await db.brand.create({ data });
  } catch (error) {
    const message = uniqueError(error, { slug: "adres" });
    if (message) return { error: message };
    throw error;
  }

  updateTag(CATALOG_TAG);
  redirect("/yonetim/markalar?durum=kaydedildi");
}

// Seçili markaları toptancı yapar (sitede gizlenir) ya da tekrar marka yapar (sitede görünür). Liste sayfasındaki forma
// bağlıdır; hangi düğmeye basıldığı "islem" alanında gelir.
export async function setBrandsWholesaler(formData: FormData): Promise<void> {
  await requireAdmin();

  const back = brandBackQuery(text(formData, "geri"));
  const ids = [...new Set(formData.getAll("ids").map(String).filter((id) => id.length > 0 && id.length <= 40))].slice(0, 2000);
  const action = text(formData, "islem");
  if (ids.length === 0 || (action !== "toptanci" && action !== "marka")) {
    back.set("durum", "marka-secilmedi");
    redirect(`/yonetim/markalar?${back}`);
  }

  const { count } = await db.brand.updateMany({ where: { id: { in: ids } }, data: { isWholesaler: action === "toptanci" } });
  updateTag(CATALOG_TAG);
  back.set("durum", action === "toptanci" ? "toptanci-yapildi" : "marka-yapildi");
  back.set("adet", String(count));
  redirect(`/yonetim/markalar?${back}`);
}

export async function deleteBrand(id: string): Promise<void> {
  await requireAdmin();
  // Ürünü olan marka silinmez; önce ürünlerin markası değiştirilmeli.
  if ((await db.product.count({ where: { brandId: id } })) > 0) redirect("/yonetim/markalar?durum=markadolu");

  await db.brand.delete({ where: { id } });
  updateTag(CATALOG_TAG);
  redirect("/yonetim/markalar?durum=silindi");
}

// ---------- Yorumlar ----------

export async function setReviewApproved(id: string, isApproved: boolean): Promise<void> {
  await requireAdmin();
  await db.review.update({ where: { id }, data: { isApproved } });
  updateTag(CATALOG_TAG);
  redirect(`/yonetim/yorumlar?durum=${isApproved ? "yayinlandi" : "kaydedildi"}`);
}

export async function deleteReview(id: string): Promise<void> {
  await requireAdmin();
  await db.review.delete({ where: { id } });
  updateTag(CATALOG_TAG);
  redirect("/yonetim/yorumlar?durum=silindi");
}

// ---------- Siparişler ----------

// Durumu ilerletir ya da siparişi iptal eder. İptalde ayrılan stok ürünlere geri verilir.
// Güncelleme koşulludur (beklenen eski durum): iki sekmeden aynı anda basılırsa stok iki kez dönmez.
export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await requireAdmin();

  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) redirect("/yonetim/siparisler");

  const allowed = status === "CANCELLED" ? !closedStatuses.includes(order.status) && order.status !== "DELIVERED" : nextStatuses[order.status].includes(status);
  if (!allowed) redirect(`/yonetim/siparisler/${id}?durum=gecersiz`);

  let changed = false;
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({ where: { id, status: order.status }, data: { status } });
    changed = updated.count === 1;
    if (!changed || status !== "CANCELLED") return;
    for (const item of order.items) {
      // Ürün sonradan silinmişse (productId boş) geri verilecek stok kaydı yoktur.
      if (item.productId) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }
  });

  if (status === "CANCELLED") updateTag(CATALOG_TAG);
  // Müşteriye durum bildirimi (hazırlanıyor / teslime hazır / iptal). Gönderim yanıtı geciktirmez.
  if (changed && status !== "DELIVERED") {
    const mail = orderStatusMail({ ...order, status }, status);
    after(() => sendMail(mail));
  }
  redirect(`/yonetim/siparisler/${id}?durum=kaydedildi`);
}

// ---------- Mesajlar ----------

export async function deleteMessage(id: string): Promise<void> {
  await requireAdmin();
  await db.contactMessage.delete({ where: { id } });
  redirect("/yonetim/mesajlar?durum=silindi");
}
