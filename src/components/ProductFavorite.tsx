import FavoriteButton from "./FavoriteButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Ürün sayfasındaki favori düğmesinin sunucu tarafı: oturumu ve favori durumunu okur. Oturum çerezi
// okunduğu için istek anında çalışır; ürün sayfasında <Suspense> içinde kullanılır (sayfanın geri kalanı önbellekli).
export default async function ProductFavorite({ productId, slug }: { productId: string; slug: string }) {
  const user = await getCurrentUser();
  const favorite = user
    ? await db.favorite.findUnique({ where: { userId_productId: { userId: user.id, productId } }, select: { productId: true } })
    : null;

  return <FavoriteButton productId={productId} slug={slug} loggedIn={Boolean(user)} initialFavorited={Boolean(favorite)} />;
}

// Oturum okunurken görünen yer tutucu (aynı ölçü; sayfa zıplamasın).
export function ProductFavoriteFallback() {
  return <span aria-hidden className="block size-11 shrink-0 rounded-full border border-neutral-300" />;
}
