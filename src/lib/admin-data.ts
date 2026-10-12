import "server-only";
import { db } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;
// İptal ve iade edilen siparişler satış sayılmaz.
const NOT_SALES = ["CANCELLED", "REFUNDED"] as const;

export interface DailyOrderStat {
  label: string;
  fullLabel: string;
  orders: number;
  revenueKurus: number;
}

// Son `days` günün (bugün dahil) günlük sipariş sayısı ve cirosu; günler Türkiye saatine göre ayrılır, siparişi
// olmayan gün sıfırla görünür. Panelin istek anında çalışan sayfalarından (requireAdmin sonrası) çağrılır.
export async function getDailyOrderStats(days: number): Promise<DailyOrderStat[]> {
  const timeZone = "Europe/Istanbul";
  const dayKey = new Intl.DateTimeFormat("sv-SE", { timeZone });
  const shortLabel = new Intl.DateTimeFormat("tr-TR", { timeZone, day: "numeric", month: "short" });
  const fullLabel = new Intl.DateTimeFormat("tr-TR", { timeZone, day: "numeric", month: "long", weekday: "long" });

  const now = Date.now();
  const buckets = new Map<string, DailyOrderStat>();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now - offset * DAY_MS);
    buckets.set(dayKey.format(date), {
      label: shortLabel.format(date),
      fullLabel: fullLabel.format(date),
      orders: 0,
      revenueKurus: 0,
    });
  }

  const orders = await db.order.findMany({
    where: { createdAt: { gte: new Date(now - days * DAY_MS) }, status: { notIn: [...NOT_SALES] } },
    select: { createdAt: true, totalKurus: true },
  });
  for (const order of orders) {
    const bucket = buckets.get(dayKey.format(order.createdAt));
    if (bucket) {
      bucket.orders += 1;
      bucket.revenueKurus += order.totalKurus;
    }
  }
  return [...buckets.values()];
}

// Son `days` günde en çok adet satılan ürünler (sipariş kalemindeki ad üzerinden; ürün silinse de görünür).
export async function getTopSoldProducts(days: number, take = 5) {
  const rows = await db.orderItem.groupBy({
    by: ["name"],
    where: { order: { createdAt: { gte: new Date(Date.now() - days * DAY_MS) }, status: { notIn: [...NOT_SALES] } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  return rows.map((row) => ({ name: row.name, quantity: row._sum.quantity ?? 0 }));
}

// Yönetim formlarındaki kategori seçimi için: ana kategoriler ve altları. Önbelleksiz okunur.
export function getCategoryOptions() {
  return db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
    },
  });
}
