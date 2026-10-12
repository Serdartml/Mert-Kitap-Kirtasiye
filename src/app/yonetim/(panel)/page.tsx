import Link from "next/link";
import DailyBars from "@/components/admin/DailyBars";
import { getDailyOrderStats, getTopSoldProducts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 5;

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [openOrders, total, active, outOfStock, lowStock, categories, messages, lowStockItems, latestMessages] = await Promise.all([
    db.order.count({ where: { status: { in: ["PENDING", "PAID", "PREPARING", "SHIPPED"] } } }),
    db.product.count(),
    db.product.count({ where: { isActive: true } }),
    db.product.count({ where: { isActive: true, stock: 0 } }),
    db.product.count({ where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK } } }),
    db.category.count(),
    db.contactMessage.count(),
    db.product.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK } },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 10,
      select: { id: true, name: true, sku: true, stock: true, priceKurus: true },
    }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const [daily, topProducts] = await Promise.all([getDailyOrderStats(14), getTopSoldProducts(30)]);
  const totalOrders = daily.reduce((sum, day) => sum + day.orders, 0);
  const totalRevenue = daily.reduce((sum, day) => sum + day.revenueKurus, 0);
  const maxOrders = Math.max(...daily.map((day) => day.orders), 0);
  const maxRevenue = Math.max(...daily.map((day) => day.revenueKurus), 0);
  const topMax = Math.max(...topProducts.map((product) => product.quantity), 1);

  const cards = [
    { label: "Açık sipariş", value: openOrders, note: "teslim bekleyen", href: "/yonetim/siparisler" },
    { label: "Ürün", value: total, note: `${active} yayında`, href: "/yonetim/urunler" },
    { label: "Stokta yok", value: outOfStock, note: "yayındaki ürünler", href: "/yonetim/urunler?filtre=stoksuz" },
    { label: "Stok azalıyor", value: lowStock, note: `${LOW_STOCK} adet ve altı`, href: "/yonetim/urunler?filtre=azalan" },
    { label: "Kategori", value: categories, note: "ana ve alt", href: "/yonetim/kategoriler" },
    { label: "Mesaj", value: messages, note: "iletişim formu", href: "/yonetim/mesajlar" },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold">
        <span className="marker">Özet</span>
      </h1>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <li key={card.label}>
            <Link href={card.href} className="block rounded-xl border border-neutral-200 bg-raised p-4 hover:border-fg">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500">{card.label}</span>
              <span className="mt-1 block text-3xl font-extrabold">{card.value}</span>
              <span className="block text-xs text-neutral-500">{card.note}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Son 14 gün: iptal ve iadeler hariç. İki ölçü iki ayrı grafikte (tek eksen). */}
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <DailyBars
          title="Günlük sipariş sayısı"
          subtitle={`Son 14 günde ${totalOrders} sipariş (iptaller hariç)`}
          data={daily.map((day) => ({
            label: day.label,
            fullLabel: day.fullLabel,
            value: day.orders,
            valueLabel: `${day.orders} sipariş`,
          }))}
          maxLabel={String(maxOrders)}
          emptyText="Son 14 günde sipariş yok."
        />
        <DailyBars
          title="Günlük ciro"
          subtitle={`Son 14 günde ${formatPrice(totalRevenue)} (KDV dahil, iptaller hariç)`}
          data={daily.map((day) => ({
            label: day.label,
            fullLabel: day.fullLabel,
            value: day.revenueKurus,
            valueLabel: formatPrice(day.revenueKurus),
          }))}
          maxLabel={formatPrice(maxRevenue).replace(",00", "")}
          emptyText="Son 14 günde ciro yok."
        />

        <section className="rounded-xl border border-neutral-200 bg-raised p-5 xl:col-span-2">
          <h2 className="text-lg font-extrabold">En çok satanlar</h2>
          <p className="text-sm text-neutral-600">Son 30 günde, satılan adede göre (iptaller hariç)</p>
          {topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Son 30 günde satış yok.</p>
          ) : (
            <ol className="mt-3 space-y-3 text-sm">
              {topProducts.map((product, index) => (
                <li key={product.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-semibold">
                      <span className="mr-2 tabular-nums text-neutral-500">{index + 1}.</span>
                      {product.name}
                    </span>
                    <span className="shrink-0 font-extrabold tabular-nums">{product.quantity} adet</span>
                  </div>
                  {/* İnce çubuk: en çok satana göre oran; uç yuvarlak, sayı metin renginde. */}
                  <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-fg/80" style={{ width: `${(product.quantity / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-raised p-5">
          <h2 className="text-lg font-extrabold">Stoğu biten ve azalanlar</h2>
          {lowStockItems.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Stoğu azalan ürün yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-200 text-sm">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <Link href={`/yonetim/urunler/${item.id}`} className="min-w-0 flex-1 truncate py-2.5 font-semibold hover:underline">
                    {item.name}
                  </Link>
                  <span className="shrink-0 text-xs text-neutral-500">{formatPrice(item.priceKurus)}</span>
                  <span
                    className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-bold ${
                      item.stock === 0 ? "bg-ink text-white" : "bg-brand-500 text-ink"
                    }`}
                  >
                    {item.stock === 0 ? "Bitti" : `${item.stock} adet`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-raised p-5">
          <h2 className="text-lg font-extrabold">Son mesajlar</h2>
          {latestMessages.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Henüz mesaj yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-200 text-sm">
              {latestMessages.map((message) => (
                <li key={message.id} className="py-2.5">
                  <p className="font-semibold">
                    {message.name} <span className="font-normal text-neutral-500">· {message.createdAt.toLocaleDateString("tr-TR")}</span>
                  </p>
                  <p className="line-clamp-2 text-neutral-600">{message.message}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/yonetim/mesajlar" className="mt-1 inline-block py-2.5 text-sm font-bold hover:underline">
            Tüm mesajlar →
          </Link>
        </section>
      </div>
    </>
  );
}
