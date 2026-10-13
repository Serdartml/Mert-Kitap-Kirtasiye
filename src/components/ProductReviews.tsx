import { Suspense } from "react";
import Link from "next/link";
import ReviewForm from "@/components/ReviewForm";
import StarRating from "@/components/StarRating";
import { getCurrentUser, LOGIN_PATH } from "@/lib/auth";
import { db } from "@/lib/db";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
}

// "Yorumlar" sekmesinin içeriği. Liste önbellekten gelir (props); form bölümü oturuma bağlı olduğu için
// <Suspense> içinde istek anında çizilir.
export default function ProductReviews({
  productId,
  slug,
  reviews,
  average,
}: {
  productId: string;
  slug: string;
  reviews: ReviewItem[];
  average: number | null;
}) {
  return (
    <div className="space-y-6">
      {average !== null && (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-extrabold">{String(average).replace(".", ",")}</span>
          <div>
            <StarRating value={average} size={18} />
            <p className="text-xs text-neutral-500">{reviews.length} yorum</p>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-neutral-600">Bu ürün için henüz yorum yok. İlk yorumu siz yazın.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {reviews.map((review) => (
            <li key={review.id} className="space-y-1 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRating value={review.rating} />
                <span className="font-bold">{review.author}</span>
                <time dateTime={review.createdAt} className="text-xs text-neutral-500">
                  {new Date(review.createdAt).toLocaleDateString("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" })}
                </time>
              </div>
              {review.comment && <p className="whitespace-pre-line leading-relaxed text-neutral-700">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      <Suspense fallback={null}>
        <ReviewFormArea productId={productId} slug={slug} />
      </Suspense>
    </div>
  );
}

async function ReviewFormArea({ productId, slug }: { productId: string; slug: string }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="rounded-xl bg-neutral-100 p-4 text-sm">
        Yorum yazmak için{" "}
        <Link href={`${LOGIN_PATH}?sonra=${encodeURIComponent(`/urun/${slug}`)}`} className="font-bold underline underline-offset-2">
          giriş yapın
        </Link>{" "}
        ya da{" "}
        <Link href={`/kayit?sonra=${encodeURIComponent(`/urun/${slug}`)}`} className="font-bold underline underline-offset-2">
          üye olun
        </Link>
        .
      </p>
    );
  }

  const existing = await db.review.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { rating: true, comment: true, isApproved: true },
  });
  return <ReviewForm productId={productId} existing={existing ? { ...existing, comment: existing.comment ?? "" } : null} />;
}
