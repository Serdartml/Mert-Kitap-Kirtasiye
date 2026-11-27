import type { OrderStatus } from "@prisma/client";

// Sipariş durumlarının müşteriye ve yönetim paneline görünen adları. İstemci bileşenleri de kullanır;
// bu yüzden "server-only" değildir.
//
// SHIPPED, mağazadan teslimde "teslime hazır", kuryeyle teslimde "yolda" anlamındadır: müşteriye görünen metin için
// statusLabel / statusNote teslimat yöntemine göre seçer (lib/delivery.ts).

export const PICKUP_PAYMENT = "magazada";
// Kartla online ödeme (lib/paytr.ts). Sipariş AWAITING_PAYMENT ile açılır, PayTR bildirimiyle PAID olur.
export const CARD_PAYMENT = "paytr";

export const paymentMethodLabels: Record<string, string> = {
  [PICKUP_PAYMENT]: "Mağazada ödeme",
  [CARD_PAYMENT]: "Kartla online ödeme (PayTR)",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Ödeme bekleniyor",
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
  AWAITING_PAYMENT: "Ödemeniz henüz onaylanmadı. Ödeme tamamlanınca siparişiniz kesinleşir.",
  PENDING: "Siparişiniz bize ulaştı. Hazırlamaya başladığımızda durumu güncelleyeceğiz.",
  PAID: "Ödemeniz alındı, siparişiniz bize ulaştı. Hazırlamaya başladığımızda durumu güncelleyeceğiz.",
  PREPARING: "Ürünleriniz hazırlanıyor.",
  SHIPPED: "Siparişiniz hazır; mağazamızdan teslim alabilirsiniz.",
  DELIVERED: "Siparişiniz teslim edildi. İyi günlerde kullanın.",
  CANCELLED: "Bu sipariş iptal edildi.",
  REFUNDED: "Bu siparişin ücreti iade edildi.",
};

// Kuryeyle teslimde (deliveryMethod "kurye", lib/delivery.ts) SHIPPED "yolda" demektir.
const courierLabels: Partial<Record<OrderStatus, string>> = { SHIPPED: "Yolda" };
const courierNotes: Partial<Record<OrderStatus, string>> = {
  SHIPPED: "Siparişiniz kuryemizle yola çıktı. Teslim alırken teslimat kodunuzu kuryeye söyleyin.",
};

export function statusLabel(status: OrderStatus, deliveryMethod?: string | null): string {
  return (deliveryMethod === "kurye" && courierLabels[status]) || orderStatusLabels[status];
}

export function statusNote(status: OrderStatus, deliveryMethod?: string | null): string {
  return (deliveryMethod === "kurye" && courierNotes[status]) || orderStatusNotes[status];
}

// Stoğu geri verilmiş, kapanmış durumlar.
export const closedStatuses: OrderStatus[] = ["CANCELLED", "REFUNDED"];

// Yönetim panelinde bir durumdan geçilebilecek sonraki durumlar (iptal ayrıca sunulur).
// Ödeme bekleyen siparişi yalnızca PayTR bildirimi ilerletir; yönetim yalnızca iptal edebilir.
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: [],
  PENDING: ["PREPARING", "SHIPPED"],
  PAID: ["PREPARING", "SHIPPED"],
  PREPARING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const orderStatusTone: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "border border-dashed border-neutral-400 text-neutral-600",
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
