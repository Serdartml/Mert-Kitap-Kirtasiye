import { getCartCount } from "@/lib/cart";

// Çerez okuduğu için istek anında çalışır; Header'da <Suspense> içinde kullanılır.
export default async function CartBadge() {
  const count = await getCartCount();
  if (count < 1) return null;

  return (
    <span className="absolute -right-2.5 -top-2.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold leading-5 text-ink">
      <span className="sr-only">Sepette </span>
      {count}
      <span className="sr-only"> ürün</span>
    </span>
  );
}
