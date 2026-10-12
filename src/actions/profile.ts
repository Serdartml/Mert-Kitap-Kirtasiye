"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, hashSessionToken, LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth";
import { addItemsToCart } from "@/lib/cart-items";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkLimits, LIMITS } from "@/lib/rate-limit";

// Üyenin kendi hesabıyla ilgili işlemler: tekrar sipariş, favoriler, adres defteri, profil ve parola.
// Her action oturumu kendisi doğrular (action'lar doğrudan POST ile de çağrılabilir) ve yalnızca oturumdaki
// kullanıcının kayıtlarına dokunur.

export interface AccountFormState {
  error: string;
  // Başarı bildirimi (boş değilse form başarıyla işlendi).
  message?: string;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function requireUserFor(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`${LOGIN_PATH}?sonra=${encodeURIComponent(next)}`);
  return user;
}

// Boşluk, tire ve parantez atıldıktan sonra: 05xx xxx xx xx, 5xx..., +90 5xx... ya da sabit hat.
const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^(\+90|0)?[1-9]\d{9}$/, "Telefon numaranızı alan koduyla yazın (örnek: 0532 123 45 67)."));

// ---------- Tekrar sipariş ----------

// Eski siparişin ürünlerini (adetleriyle) sepete ekler ve sepete götürür. Satıştan kalkan ya da stokta olmayan
// ürünler atlanır; hiçbiri eklenemezse hesabım sayfasında bilgi verilir.
export async function reorder(orderId: string): Promise<void> {
  const user = await requireUserFor("/hesabim");

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: { select: { productId: true, quantity: true } } },
  });
  if (!order) redirect("/hesabim");

  const items = order.items.flatMap((item) => (item.productId ? [{ productId: item.productId, quantity: item.quantity }] : []));
  const result = items.length ? await addItemsToCart(items) : { added: 0, skipped: 0, adjusted: 0 };

  revalidatePath("/", "layout");
  redirect(result.added > 0 ? "/sepet" : "/hesabim?tekrar=stok-yok");
}

// ---------- Favoriler ----------

export interface FavoriteResult {
  ok: boolean;
  favorited: boolean;
  needsLogin?: boolean;
}

export async function toggleFavorite(productId: string): Promise<FavoriteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, favorited: false, needsLogin: true };
  if (typeof productId !== "string" || !/^[a-z0-9]+$/.test(productId)) return { ok: false, favorited: false };

  const key = { userId_productId: { userId: user.id, productId } };
  const existing = await db.favorite.findUnique({ where: key });
  if (existing) {
    await db.favorite.delete({ where: key });
    revalidatePath("/hesabim/favoriler");
    return { ok: true, favorited: false };
  }

  const product = await db.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
  if (!product) return { ok: false, favorited: false };
  await db.favorite.create({ data: { userId: user.id, productId } });
  revalidatePath("/hesabim/favoriler");
  return { ok: true, favorited: true };
}

// ---------- Adres defteri ----------

const MAX_ADDRESSES = 10;

const addressSchema = z.object({
  title: z.string().min(1, "Adrese bir ad verin (örn. Ev, İş).").max(30, "Adres adı en fazla 30 karakter olabilir."),
  fullName: z.string().min(2, "Alıcının adını ve soyadını yazın.").max(100),
  phone: phoneSchema,
  city: z.string().min(2, "İl yazın.").max(60),
  district: z.string().min(2, "İlçe yazın.").max(60),
  line: z.string().min(5, "Açık adresi yazın (mahalle, cadde, bina ve daire no).").max(250, "Açık adres en fazla 250 karakter olabilir."),
  postalCode: z.string().regex(/^\d{5}$/, "Posta kodu 5 haneli olmalı.").or(z.literal("")),
});

export async function saveAddress(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUserFor("/hesabim/adresler");

  const parsed = addressSchema.safeParse({
    title: text(formData, "title"),
    fullName: text(formData, "fullName"),
    phone: text(formData, "phone"),
    city: text(formData, "city"),
    district: text(formData, "district"),
    line: text(formData, "line"),
    postalCode: text(formData, "postalCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= MAX_ADDRESSES) return { error: `En fazla ${MAX_ADDRESSES} adres kaydedebilirsiniz. Önce birini silin.` };

  // İlk adres ya da "varsayılan yap" işaretliyse diğerlerinin varsayılanı kalkar.
  const makeDefault = count === 0 || formData.get("isDefault") === "on";
  const { postalCode, ...rest } = parsed.data;
  await db.$transaction([
    ...(makeDefault ? [db.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } })] : []),
    db.address.create({ data: { ...rest, postalCode: postalCode || null, userId: user.id, isDefault: makeDefault } }),
  ]);

  revalidatePath("/hesabim/adresler");
  return { error: "", message: "Adres kaydedildi." };
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await requireUserFor("/hesabim/adresler");
  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (address) {
    await db.address.delete({ where: { id: address.id } });
    // Varsayılan silindiyse en eski kalan adres varsayılan olur.
    if (address.isDefault) {
      const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  revalidatePath("/hesabim/adresler");
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  const user = await requireUserFor("/hesabim/adresler");
  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (address) {
    await db.$transaction([
      db.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } }),
      db.address.update({ where: { id: address.id }, data: { isDefault: true } }),
    ]);
  }
  revalidatePath("/hesabim/adresler");
}

// ---------- Profil ve parola ----------

const profileSchema = z.object({
  name: z.string().min(2, "Adınızı ve soyadınızı yazın.").max(100),
  // Telefon isteğe bağlı: boşsa temizlenir.
  phone: z.union([z.literal(""), phoneSchema]),
});

export async function updateProfile(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUserFor("/hesabim/profil");

  const parsed = profileSchema.safeParse({ name: text(formData, "name"), phone: text(formData, "phone") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null } });
  revalidatePath("/hesabim", "layout");
  return { error: "", message: "Bilgileriniz güncellendi." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mevcut parolanızı yazın.").max(200),
    next: z.string().min(8, "Yeni parolanız en az 8 karakter olmalı.").max(200, "Yeni parolanız çok uzun."),
    confirm: z.string().max(200),
  })
  .refine((value) => value.next === value.confirm, { message: "Yeni parolalar aynı değil.", path: ["confirm"] });

export async function changePassword(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUserFor("/hesabim/profil");

  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  // Pahalı parola özetinden önce: oturumu ele geçiren biri mevcut parolayı deneyerek bulamasın.
  const blocked = await checkLimits([{ key: `password-change:${user.id}`, limit: LIMITS.passwordChange }]);
  if (blocked) return { error: blocked };

  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return { error: "Mevcut parolanız hatalı." };
  if (parsed.data.next === parsed.data.current) return { error: "Yeni parolanız mevcut parolanızdan farklı olmalı." };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });

  // Diğer cihazlardaki oturumlar kapanır; bu cihazdaki açık kalır.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId: user.id, ...(token ? { tokenHash: { not: hashSessionToken(token) } } : {}) },
  });
  return { error: "", message: "Parolanız değiştirildi. Diğer cihazlardaki oturumlarınız kapatıldı." };
}
