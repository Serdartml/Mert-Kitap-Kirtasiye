"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkLimits, LIMITS } from "@/lib/rate-limit";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "@/lib/reviews";

export interface ReviewFormState {
  error: string;
  message?: string;
}

const reviewSchema = z.object({
  productId: z.string().min(1).max(60),
  rating: z.coerce.number().int().min(1, "Puan seçin.").max(5, "Puan seçin."),
  comment: z
    .string()
    .trim()
    .min(MIN_COMMENT_LENGTH, `Yorumunuz en az ${MIN_COMMENT_LENGTH} karakter olmalı.`)
    .max(MAX_COMMENT_LENGTH, `Yorumunuz en fazla ${MAX_COMMENT_LENGTH} karakter olabilir.`),
});

// Üye ürüne yorum yazar. Üye başına ürün başına tek yorum vardır; tekrar gönderilirse güncellenir ve yeniden
// onaya düşer. Yorumlar yönetici onayından sonra yayınlanır (isApproved).
export async function submitReview(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Yorum yazmak için giriş yapın." };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating") || 0,
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const blocked = await checkLimits([{ key: `review:${user.id}`, limit: LIMITS.reviewUser }]);
  if (blocked) return { error: blocked };

  const product = await db.product.findFirst({ where: { id: parsed.data.productId, isActive: true }, select: { id: true, slug: true } });
  if (!product) return { error: "Ürün bulunamadı." };

  const { rating, comment } = parsed.data;
  await db.review.upsert({
    where: { productId_userId: { productId: product.id, userId: user.id } },
    create: { productId: product.id, userId: user.id, rating, comment },
    update: { rating, comment, isApproved: false },
  });

  revalidatePath(`/urun/${product.slug}`);
  return { error: "", message: "Teşekkürler! Yorumunuz incelendikten sonra yayınlanacak." };
}
