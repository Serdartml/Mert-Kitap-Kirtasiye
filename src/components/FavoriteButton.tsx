"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/actions/profile";

interface FavoriteButtonProps {
  productId: string;
  // Oturum açmamış ziyaretçi giriş sayfasına yönlendirilir ve ürüne geri döner.
  slug: string;
  loggedIn: boolean;
  initialFavorited: boolean;
}

// Ürün sayfasındaki kalp düğmesi. Dokunulunca anında değişir (iyimser güncelleme), sunucu reddederse geri alınır.
export default function FavoriteButton({ productId, slug, loggedIn, initialFavorited }: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const goToLogin = () => router.push(`/giris?sonra=${encodeURIComponent(`/urun/${slug}`)}`);

  const onClick = () => {
    if (!loggedIn) return goToLogin();
    const previous = favorited;
    setFavorited(!previous);
    startTransition(async () => {
      const result = await toggleFavorite(productId);
      if (result.needsLogin) {
        setFavorited(previous);
        goToLogin();
      } else if (!result.ok) {
        setFavorited(previous);
      } else {
        setFavorited(result.favorited);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Favorilerden çıkar" : "Favorilere ekle"}
      title={loggedIn ? undefined : "Favorilere eklemek için giriş yapın"}
      className={`grid size-11 shrink-0 place-items-center rounded-full border transition-colors ${
        favorited ? "border-brand-500 bg-brand-500 text-ink" : "border-neutral-300 hover:border-fg"
      }`}
    >
      <Heart size={20} aria-hidden fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
