import type { OrderStatus } from "@prisma/client";

// Sipariş durumlarının müşteriye ve yönetim paneline görünen adları. İstemci bileşenleri de kullanır;
// bu yüzden "server-only" değildir.
//
// Şimdilik tek teslimat yöntemi var: mağazadan teslim, ödeme mağazada. Bu yüzden SHIPPED "teslime hazır"
// anlamında kullanılır. Kargo ve online ödeme eklendiğinde Order'a teslimat yöntemi alanı gelmeli ve
// etiketler ona göre ayrılmalı.

export const PICKUP_PAYMENT = "magazada";

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Sipariş alındı",
  PAID: "Ödendi",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Teslime hazır",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal edildi",
  REFUNDED: "İade edildi",
};

// Müşteriye durumun ne anlama geldiğini söyleyen kısa açıklama.
export const orderStatusNotes: Record<OrderStatus, string> = {
  PENDING: "Siparişiniz bize ulaştı. Hazırlamaya başladığımızda durumu güncelleyeceğiz.",
  PAID: "Ödemeniz alındı.",
  PREPARING: "Ürünleriniz hazırlanıyor.",
  SHIPPED: "Siparişiniz hazır; mağazamızdan teslim alabilirsiniz.",
  DELIVERED: "Siparişiniz teslim edildi. İyi günlerde kullanın.",
  CANCELLED: "Bu sipariş iptal edildi.",
  REFUNDED: "Bu siparişin ücreti iade edildi.",
};

// Stoğu geri verilmiş, kapanmış durumlar.
export const closedStatuses: OrderStatus[] = ["CANCELLED", "REFUNDED"];

// Yönetim panelinde bir durumdan geçilebilecek sonraki durumlar (iptal ayrıca sunulur).
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "SHIPPED"],
  PAID: ["PREPARING", "SHIPPED"],
  PREPARING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const orderStatusTone: Record<OrderStatus, string> = {
  PENDING: "bg-brand-500 text-ink",
  PAID: "bg-brand-500 text-ink",
  PREPARING: "bg-brand-200 text-fg",
  SHIPPED: "bg-fg text-surface",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  CANCELLED: "bg-neutral-200 text-neutral-600",
  REFUNDED: "bg-neutral-200 text-neutral-600",
};

export function formatOrderDate(date: Date): string {
  return date.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" });
}
