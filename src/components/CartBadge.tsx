import CartCount from "./CartCount";
import { getCartCount } from "@/lib/cart";

// Çerez okuduğu için istek anında çalışır; Header'da <Suspense> içinde kullanılır.
// Sepet boşken de CartCount çizilir ki ilk ürün eklendiğinde rozet zıplayabilsin.
export default async function CartBadge() {
  return <CartCount count={await getCartCount()} />;
}
