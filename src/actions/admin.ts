"use server";

import { Prisma } from "@prisma/client";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
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

  const attributes = parseAttributes(text(formData, "attributes"));
  if (attributes.some((attribute) => attribute === null)) {
    return { error: 'Özellikler her satırda "Ad: Değer" biçiminde olmalı.' };
  }
  const attributeRows = attributes.filter((attribute) => attribute !== null);

  const { barcode, description, ...rest } = parsed.data;
  const data = {
    ...rest,
    barcode: barcode || null,
    description: description || null,
    priceKurus,
    compareAtKurus,
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

// ---------- Mesajlar ----------

export async function deleteMessage(id: string): Promise<void> {
  await requireAdmin();
  await db.contactMessage.delete({ where: { id } });
  redirect("/yonetim/mesajlar?durum=silindi");
}
