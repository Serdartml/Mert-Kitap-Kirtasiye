"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { addToCart } from "@/actions/cart";

interface AddToCartButtonProps {
  productId: string;
  stock: number;
  // "full": ürün sayfasındaki adet seçicili büyük sürüm; "compact": ürün kartındaki tek buton.
  variant?: "compact" | "full";
}

export default function AddToCartButton({ productId, stock, variant = "compact" }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (stock < 1) {
    return (
      <button type="button" disabled className={`btn btn-outline w-full ${variant === "compact" ? "py-2.5" : ""}`}>
        Stokta yok
      </button>
    );
  }

  const submit = () =>
    startTransition(async () => {
      setFeedback(await addToCart(productId, quantity));
    });

  return (
    <div className="space-y-2">
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
          type="button"
          onClick={submit}
          disabled={pending}
          className={`btn btn-primary flex-1 ${variant === "compact" ? "py-2.5" : ""}`}
        >
          <ShoppingCart size={18} />
          {pending ? "Ekleniyor..." : "Sepete Ekle"}
        </button>
      </div>
      {feedback && (
        <p role="status" className={`text-xs font-semibold ${feedback.ok ? "text-green-700" : "text-red-700"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
