import { Suspense } from "react";
import type { Metadata } from "next";
import AccountFrame from "@/components/AccountFrame";
import EmptyState from "@/components/EmptyState";
import ProductGrid from "@/components/ProductGrid";
import { PanelSkeleton } from "@/components/Skeletons";
import { requireUser } from "@/lib/auth";
import { productCardInclude } from "@/lib/catalog";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Favorilerim",
  robots: { index: false },
};

export default function FavoritesPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <FavoritesContent />
    </Suspense>
  );
}

async function FavoritesContent() {
  const user = await requireUser("/hesabim/favoriler");

  // Satıştan kalkan ürünler listede görünmez (kayıt silinmez; ürün geri gelirse yine listededir).
  const favorites = await db.favorite.findMany({
    where: { userId: user.id, product: { isActive: true } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { include: productCardInclude } },
  });

  return (
    <AccountFrame user={user} active="favoriler" wide>
      <h2 className="mb-3 text-lg font-extrabold">Favorilerim</h2>
      {favorites.length === 0 ? (
        <EmptyState
          title="Henüz favoriniz yok"
          text="Bir ürün sayfasındaki kalp simgesine dokunarak ürünü favorilerinize ekleyebilirsiniz."
          action={{ href: "/", label: "Ürünlere Göz At" }}
        />
      ) : (
        <ProductGrid products={favorites.map((favorite) => favorite.product)} dense />
      )}
    </AccountFrame>
  );
}
