"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { welcomeDiscountKurus } from "@/lib/campaign";
import { getCartId } from "@/lib/cart";
import { COURIER_CITY, COURIER_DELIVERY, COURIER_DISTRICTS, courierFeeKurus, isCourierDistrict, PICKUP_DELIVERY } from "@/lib/delivery";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { sendOrderPlacedMails } from "@/lib/order-mail";
import { CARD_PAYMENT, PICKUP_PAYMENT } from "@/lib/order-status";
import { generateOrderNo, rememberGuestOrder } from "@/lib/orders";
import { cancelAwaitingOrdersOfCart, cancelExpiredAwaitingOrders, isCardPaymentEnabled } from "@/lib/paytr";
import { checkLimits, clientIp, LIMITS } from "@/lib/rate-limit";
import { site } from "@/lib/site";

export interface FormState {
  error: string;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Adınızı ve soyadınızı yazın.").max(100),
  email: z.email("Geçerli bir e-posta adresi yazın.").max(200),
  // Boşluk, tire ve parantez atıldıktan sonra: 05xx xxx xx xx, 5xx..., +90 5xx... ya da sabit hat.
  phone: z
    .string()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^(\+90|0)?[1-9]\d{9}$/, "Telefon numaranızı alan koduyla yazın (örnek: 0532 123 45 67).")),
  note: z.string().max(500, "Notunuz en fazla 500 karakter olabilir."),
});

// İzmir içi kurye ile teslimde adres. Yalnızca kuryenin gittiği ilçeler kabul edilir (lib/delivery.ts).
const courierAddressSchema = z.object({
  district: z.string().refine(isCourierDistrict, `Kurye ile teslimat yalnızca İzmir'in şu ilçelerine yapılır: ${COURIER_DISTRICTS.join(", ")}.`),
  line: z.string().min(10, "Açık adresinizi mahalle, sokak, bina ve daire numarasıyla yazın.").max(250, "Adres en fazla 250 karakter olabilir."),
  postalCode: z.string().regex(/^(\d{5})?$/, "Posta kodu 5 haneli olmalı (isteğe bağlı)."),
});

// İşlemin (transaction) içinden müşteriye gösterilecek bir nedenle çıkmak için.
class CheckoutError extends Error {}

// Sipariş verir. Teslimat iki yoldan: mağazadan teslim ya da İzmir içi kurye ile teslim (lib/delivery.ts; yalnızca belirli
// ilçeler, ücret ürün toplamına göre, ödeme yalnızca kartla: kapıda ödeme yok). Ödeme iki yoldan:
// - Mağazada ödeme (yalnızca mağazadan teslimde): sipariş PENDING ile açılır, sepet boşalır, e-postalar hemen gider.
// - Kartla ödeme (PayTR, lib/paytr.ts): sipariş AWAITING_PAYMENT ile açılır, sepet ödeme onaylanana kadar durur, müşteri
//   ödeme sayfasına gider. E-postalar ödeme bildirimi gelince gider (api/paytr/bildirim).
//
// Stok sipariş anında düşülür (ürün müşteri için ayrılır); sipariş iptal edilirse ya da kartla ödeme olmazsa geri verilir
// (actions/admin.ts, setOrderStatus; lib/paytr.ts). Düşüm koşulludur: iki kişi aynı anda son ürünü alamaz.
export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = checkoutSchema.safeParse({
    fullName: text(formData, "fullName"),
    email: text(formData, "email").toLowerCase(),
    phone: text(formData, "phone"),
    note: text(formData, "note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  // Ön bilgilendirme ve sözleşme onayı (Mesafeli Sözleşmeler Yönetmeliği m. 6); tarayıcıdaki required atlatılsa da aranır.
  if (formData.get("sozlesme") !== "on") {
    return { error: "Siparişi verebilmek için Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni onaylayın." };
  }
  const courier = formData.get("teslimat") === COURIER_DELIVERY;
  const payByCard = formData.get("odeme") === "kart";
  if (courier && !payByCard) return { error: "Kurye ile teslimde ödeme online, kartla yapılır; kapıda ödeme yoktur." };
  if (payByCard && !isCardPaymentEnabled()) {
    return { error: courier ? "Kurye ile teslim şu an kullanılamıyor. Lütfen mağazadan teslimi seçin." : "Kartla ödeme şu an kullanılamıyor. Lütfen mağazada ödemeyi seçin." };
  }
  let address: z.infer<typeof courierAddressSchema> | null = null;
  if (courier) {
    const parsedAddress = courierAddressSchema.safeParse({
      district: text(formData, "district"),
      line: text(formData, "line"),
      postalCode: text(formData, "postalCode"),
    });
    if (!parsedAddress.success) return { error: parsedAddress.error.issues[0]?.message ?? "Adresinizi kontrol edin." };
    address = parsedAddress.data;
  }

  const cartId = await getCartId();
  if (!cartId) return { error: "Sepetiniz boş." };
  const user = await getCurrentUser();
  const { fullName, email, phone, note } = parsed.data;

  const blocked = await checkLimits([
    { key: `order-ip:${await clientIp()}`, limit: LIMITS.orderIp },
    { key: `order-email:${email}`, limit: LIMITS.orderEmail },
  ]);
  if (blocked) return { error: blocked };

  // Ödeme çerçevesi kapanmış, ödenmemiş siparişlerin stoğu geri döner (sunucu cron'u da günlük yapar).
  await cancelExpiredAwaitingOrders().catch((error) => console.error("[PayTR] Süresi dolan siparişler iptal edilemedi:", error));

  let order: Prisma.OrderGetPayload<{ include: { items: true } }>;
  try {
    order = await db.$transaction(async (tx) => {
      // Bu sepetten açılıp ödemesi yarım kalan sipariş varsa önce o iptal edilir: stok iki kez ayrılmaz.
      await cancelAwaitingOrdersOfCart(tx, cartId);

      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { product: true } } },
      });
      if (!cart || cart.items.length === 0) throw new CheckoutError("Sepetiniz boş.");

      for (const item of cart.items) {
        if (!item.product.isActive) {
          throw new CheckoutError(`"${item.product.name}" artık satışta değil. Sepetinizden çıkarıp tekrar deneyin.`);
        }
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) {
          throw new CheckoutError(`"${item.product.name}" için stokta yeterli ürün kalmadı. Sepetinizi güncelleyip tekrar deneyin.`);
        }
      }

      const subtotalKurus = cart.items.reduce((sum, item) => sum + item.product.priceKurus * item.quantity, 0);
      // Hoş geldin indirimi (lib/campaign.ts): yalnızca üyeye, ilk siparişte; formdaki e-posta ve telefonla da bakılır.
      const discountKurus = await welcomeDiscountKurus(
        tx,
        user ? { userId: user.id, emails: [user.email, email], phones: [user.phone ?? "", phone] } : null,
        subtotalKurus,
      );
      // Kurye ücreti ürün toplamına (indirimden önce) göre: 1.000 TL ve üzeri ücretsiz.
      const shippingKurus = address ? courierFeeKurus(subtotalKurus) : 0;
      const created = await tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          userId: user?.id ?? null,
          email,
          fullName,
          phone,
          deliveryMethod: address ? COURIER_DELIVERY : PICKUP_DELIVERY,
          // Mağazadan teslimde adres alanlarına mağazanın adresi yazılır.
          shipCity: address ? COURIER_CITY : site.address.city,
          shipDistrict: address ? address.district : site.address.district,
          shipLine: address ? address.line : `Mağazadan teslim: ${site.address.line}`,
          shipPostalCode: address?.postalCode || null,
          subtotalKurus,
          shippingKurus,
          totalKurus: subtotalKurus + shippingKurus - discountKurus,
          status: payByCard ? "AWAITING_PAYMENT" : "PENDING",
          paymentProvider: payByCard ? CARD_PAYMENT : PICKUP_PAYMENT,
          cartId: payByCard ? cartId : null,
          note: note || null,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              name: item.product.name,
              sku: item.product.sku,
              unitPriceKurus: item.product.priceKurus,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Kartla ödemede sepet, ödeme onaylanınca boşaltılır (lib/paytr.ts, settlePaidOrder).
      if (!payByCard) await tx.cartItem.deleteMany({ where: { cartId } });
      return created;
    });
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message };
    // Sipariş numarası çakışması (çok düşük olasılık): müşteri tekrar denediğinde yeni numara üretilir.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Siparişiniz oluşturulamadı. Lütfen tekrar deneyin." };
    }
    throw error;
  }

  if (!user) await rememberGuestOrder(order.id);
  // Stok değişti: katalog önbelleği ve sepet rozeti yenilensin.
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
  if (payByCard) redirect(`/odeme/kart/${order.orderNo}`);
  // Müşteriye onay, mağazaya bildirim (lib/order-mail.ts). Gönderim yanıtı geciktirmez ve hatası siparişi etkilemez.
  after(() => sendOrderPlacedMails(order));
  redirect(`/siparis/${order.orderNo}`);
}
