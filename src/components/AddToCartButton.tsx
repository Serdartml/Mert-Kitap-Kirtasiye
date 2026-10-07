"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { addToCart, type CartActionResult } from "@/actions/cart";
import { flyToCart } from "@/lib/fly-to-cart";

interface AddToCartButtonProps {
  productId: string;
  stock: number;
  // "full": ürün sayfasındaki adet seçicili büyük sürüm; "compact": ürün kartındaki tek buton.
  variant?: "compact" | "full";
}

// Mobilde iki sütunlu kartlara sığması için dar iç boşluk ve küçük yazı.
const compactClasses = "gap-1.5 whitespace-nowrap px-2 py-2.5 text-xs sm:gap-2 sm:px-4 sm:text-sm";

// Butonun "Eklendi" durumunda kaldığı süre.
const ADDED_MS = 2000;

export default function AddToCartButton({ productId, stock, variant = "compact" }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<CartActionResult | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  if (stock < 1) {
    return (
      <button type="button" disabled className={`btn btn-outline w-full ${variant === "compact" ? compactClasses : ""}`}>
        Stokta yok
      </button>
    );
  }

  const submit = () => {
    // Uçuş tıklama anında başlar; sunucu cevabı geldiğinde sepet rozeti zıplar.
    if (button.current) flyToCart(button.current);
    startTransition(async () => {
      const result = await addToCart(productId, quantity);
      setFeedback(result);
      if (result.ok) {
        setAdded(true);
        clearTimeout(addedTimer.current);
        addedTimer.current = setTimeout(() => setAdded(false), ADDED_MS);
      }
    });
  };

  const iconSize = variant === "compact" ? 16 : 18;
  // Sorunsuz eklemede buton zaten "Eklendi" der; kartta ayrıca yazı gösterilmez ki kart yüksekliği oynamasın.
  const quietSuccess = feedback?.ok && !feedback.adjusted && variant === "compact";

  return (
    <div>
      <div className="flex gap-3">
        {variant === "full" && (
          <div className="flex items-center rounded-lg border border-neutral-300">
            <button
              type="button"
              aria-label="Adedi azalt"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="grid size-11 place-items-center disabled:opacity-30"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center text-sm font-bold" aria-live="polite">{quantity}</span>
            <button
              type="button"
              aria-label="Adedi artır"
              onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
              disabled={quantity >= stock}
              className="grid size-11 place-items-center disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
        <button
          ref={button}
          type="button"
          onClick={submit}
          disabled={pending}
          className={`btn min-w-0 flex-1 ${added && !pending ? "btn-dark" : "btn-primary"} ${variant === "compact" ? compactClasses : ""}`}
        >
          {pending ? (
            <>
              <ShoppingCart size={iconSize} className="shrink-0" /> Ekleniyor...
            </>
          ) : added ? (
            <>
              <Check size={iconSize} strokeWidth={3} className="shrink-0" /> Eklendi
            </>
          ) : (
            <>
              <ShoppingCart size={iconSize} className="shrink-0" /> Sepete Ekle
            </>
          )}
        </button>
      </div>
      {feedback && (
        <p
          role="status"
          className={
            quietSuccess
              ? "sr-only"
              : `mt-2 text-xs font-semibold ${feedback.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`
          }
        >
          {feedback.message}
          {feedback.ok && variant === "full" && (
            <>
              {" "}
              <Link href="/sepet" className="underline">
                Sepete git
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
