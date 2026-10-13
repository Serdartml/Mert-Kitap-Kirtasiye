"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/reviews";
import { useServerForm } from "@/components/admin/useServerForm";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "@/lib/reviews";

// Yorum formu. existing: üyenin bu ürüne daha önce yazdığı yorum (düzenleme için).
export default function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing?: { rating: number; comment: string; isApproved: boolean } | null;
}) {
  const { state, pending, onSubmit } = useServerForm(submitReview);
  const [rating, setRating] = useState(existing?.rating ?? 0);

  if (state.message) {
    return (
      <p role="status" className="rounded-xl bg-green-100 p-4 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
        {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-raised p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />

      <p className="text-sm font-extrabold">{existing ? "Yorumunuzu güncelleyin" : "Bu ürünü değerlendirin"}</p>
      {existing && !existing.isApproved && (
        <p className="text-xs text-neutral-500">Yorumunuz inceleniyor; güncellerseniz yeniden incelenir.</p>
      )}

      <div role="radiogroup" aria-label="Puan" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} yıldız`}
            onClick={() => setRating(n)}
            className="grid size-11 place-items-center rounded-lg hover:bg-neutral-100"
          >
            <Star size={26} aria-hidden className={n <= rating ? "fill-brand-500 text-brand-600" : "text-neutral-300"} />
          </button>
        ))}
      </div>

      <label className="block text-sm font-bold">
        Yorumunuz
        <textarea
          name="comment"
          defaultValue={existing?.comment ?? ""}
          required
          rows={4}
          minLength={MIN_COMMENT_LENGTH}
          maxLength={MAX_COMMENT_LENGTH}
          className="field mt-1.5 font-normal"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Gönderiliyor..." : "Yorumu gönder"}
      </button>
    </form>
  );
}
