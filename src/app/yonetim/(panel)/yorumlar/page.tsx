import type { Metadata } from "next";
import Link from "next/link";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { deleteReview, setReviewApproved } from "@/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusNote from "@/components/admin/StatusNote";
import StarRating from "@/components/StarRating";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Yorumlar" };

export const instant = false;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireAdmin();
  const { durum } = await searchParams;

  const reviews = await db.review.findMany({
    // Onay bekleyenler üstte.
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { user: { select: { name: true, email: true } }, product: { select: { id: true, name: true, slug: true } } },
  });
  const pending = reviews.filter((review) => !review.isApproved).length;

  return (
    <>
      <h1 className="text-2xl font-extrabold">
        <span className="marker">Yorumlar</span>
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Müşteri yorumları siz onaylayana kadar sitede görünmez. {pending > 0 ? `${pending} yorum onay bekliyor.` : "Onay bekleyen yorum yok."}
      </p>

      <div className="mt-5">
        <StatusNote status={durum} />
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          Henüz yorum yok.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-neutral-200 bg-raised p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/yonetim/urunler/${review.product.id}`} className="font-extrabold hover:underline">
                    {review.product.name}
                  </Link>
                  <p className="break-all text-sm text-neutral-600">
                    {review.user.name ?? "İsimsiz"} · {review.user.email}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    review.isApproved ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-brand-500 text-ink"
                  }`}
                >
                  {review.isApproved ? "Yayında" : "Onay bekliyor"}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <StarRating value={review.rating} />
                <time dateTime={review.createdAt.toISOString()} className="text-xs text-neutral-500">
                  {review.createdAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" })}
                </time>
              </div>
              {review.comment && <p className="mt-2 whitespace-pre-line break-words text-sm">{review.comment}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={setReviewApproved.bind(null, review.id, !review.isApproved)}>
                  <button type="submit" className="btn btn-outline min-h-10 py-2 text-sm">
                    {review.isApproved ? <EyeOff size={16} aria-hidden /> : <Check size={16} aria-hidden />}
                    {review.isApproved ? "Yayından kaldır" : "Yayınla"}
                  </button>
                </form>
                <form action={deleteReview.bind(null, review.id)}>
                  <ConfirmButton
                    message="Bu yorum kalıcı olarak silinecek. Emin misiniz?"
                    className="btn min-h-10 border border-red-300 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 size={16} aria-hidden /> Sil
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
