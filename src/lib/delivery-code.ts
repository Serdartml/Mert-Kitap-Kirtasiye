import { randomInt, timingSafeEqual } from "node:crypto";

// Teslimat doğrulama kodu: altı haneli, müşteriye e-postayla ve kendi sipariş sayfasında gösterilir. Kurye kodu
// müşteriden öğrenip yönetim ekranına girer. Yanlış denemeler sınırlıdır; sınır dolunca yeni kod gönderilir.
export const MAX_DELIVERY_CODE_ATTEMPTS = 5;

export const generateDeliveryCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const normalizeDeliveryCode = (value: string) => value.replace(/\s/g, "");

export function deliveryCodeMatches(expected: string, given: string): boolean {
  const entered = normalizeDeliveryCode(given);
  if (!/^\d{6}$/.test(entered) || entered.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(entered));
}
