import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 5;

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [total, active, outOfStock, lowStock, categories, messages, lowStockItems, latestMessages] = await Promise.all([
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

  const cards = [
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

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
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

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-raised p-5">
          <h2 className="text-lg font-extrabold">Stoğu biten ve azalanlar</h2>
          {lowStockItems.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Stoğu azalan ürün yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-200 text-sm">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <Link href={`/yonetim/urunler/${item.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
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
          <Link href="/yonetim/mesajlar" className="mt-3 inline-block text-sm font-bold hover:underline">
            Tüm mesajlar →
          </Link>
        </section>
      </div>
    </>
  );
}
