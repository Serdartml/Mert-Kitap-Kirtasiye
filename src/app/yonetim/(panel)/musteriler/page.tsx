import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Müşteriler" };

const PAGE_SIZE = 100;

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ sira?: string }> }) {
  await requireAdmin();
  const { sira } = await searchParams;
  const oldestFirst = sira === "eski";

  const where = { role: "CUSTOMER" } as const;
  const [customers, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: oldestFirst ? "asc" : "desc" },
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
  ]);

  const SortIcon = oldestFirst ? ArrowUpNarrowWide : ArrowDownWideNarrow;

  return (
    <>
      <h1 className="text-2xl font-extrabold">
        <span className="marker">Müşteriler</span>
      </h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-600">
          Üye olan müşteriler ({total}){total > PAGE_SIZE && `, ${oldestFirst ? "ilk" : "son"} ${PAGE_SIZE} kayıt`}.
        </p>
        <Link
          href={oldestFirst ? "/yonetim/musteriler" : "/yonetim/musteriler?sira=eski"}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-raised px-3 text-sm font-bold hover:bg-neutral-100"
        >
          <SortIcon size={16} aria-hidden />
          {oldestFirst ? "Eskiden yeniye" : "Yeniden eskiye"}
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          Henüz üye olan müşteri yok.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {customers.map((customer) => (
            <li key={customer.id} className="rounded-xl border border-neutral-200 bg-raised p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-extrabold">{customer.name ?? "(isimsiz)"}</p>
                  <a href={`mailto:${customer.email}`} className="break-all text-sm text-neutral-600 hover:underline">
                    {customer.email}
                  </a>
                  {customer.phone && <p className="text-sm text-neutral-600">{customer.phone}</p>}
                </div>
                <div className="text-right">
                  <time dateTime={customer.createdAt.toISOString()} className="block text-xs text-neutral-500">
                    {customer.createdAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" })}
                  </time>
                  <p className="mt-1 text-xs font-bold text-neutral-600">{customer._count.orders} sipariş</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
