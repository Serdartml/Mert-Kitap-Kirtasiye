import "server-only";
import type { OrderStatus } from "@prisma/client";
import { db } from "./db";

// Üyeliksiz sipariş takibi (/siparis-takip): sipariş numarası ile yalnızca DURUM görülür. Numara tahmin edilemez
// (tarih + 6 rastgele karakter, ~887 milyon olasılık; bkz. lib/orders.ts) ve sorgu IP başına sınırlıdır, bu yüzden tek başına
// yeterlidir. Kişisel bilgi (ad, telefon, e-posta, adres) ve ürünler burada ASLA döndürülmez; onlar için siparişi veren
// tarayıcı ya da üye oturumu gerekir (getOrderForViewer).

// MK-261007-7HQ4KD; kullanıcı küçük harf, boşluk ya da tire eksikliğiyle yazabilir. Geçersizse null.
export function normalizeOrderNo(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s_-]+/g, "");
  const match = compact.match(/^MK(\d{6})([2-9A-HJKMNP-Z]{6})$/);
  return match ? `MK-${match[1]}-${match[2]}` : null;
}

export interface TrackedOrder {
  orderNo: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export async function findOrderForTracking(orderNo: string): Promise<TrackedOrder | null> {
  return db.order.findUnique({
    where: { orderNo },
    select: { orderNo: true, status: true, createdAt: true, updatedAt: true },
  });
}
