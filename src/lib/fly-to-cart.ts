// Sepete eklenen ürünün görselini üstteki sepet ikonuna uçurur. Yalnızca tarayıcıda çağrılır.
// Görsel ProductVisual'daki [data-fly-source], hedef Header'daki [data-cart-target] ile bulunur.

const FLIGHT_MS = 650;

function inViewport(rect: DOMRect) {
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
}

export function flyToCart(button: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Kartta kendi görseli, ürün sayfasında sayfanın ana görseli.
  const scope = button.closest("article") ?? document.querySelector("main");
  const visual = scope?.querySelector<HTMLElement>("[data-fly-source]");
  // Mobilde ve masaüstünde ayrı sepet bağlantıları olabilir; görünür olan seçilir.
  const cart = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((el) => el.getClientRects().length > 0);
  if (!visual || !cart) return;

  // Görsel ekranda değilse (alttaki satın alma çubuğundan eklenirken) uçuş butondan başlar.
  const visualRect = visual.getBoundingClientRect();
  const start = inViewport(visualRect) ? visualRect : button.getBoundingClientRect();
  const end = cart.getBoundingClientRect();
  const size = Math.max(48, Math.min(start.width, start.height, 140));
  const left = start.left + (start.width - size) / 2;
  const top = start.top + (start.height - size) / 2;

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: "90",
    pointerEvents: "none",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)",
  });
  const copy = visual.cloneNode(true) as HTMLElement;
  copy.removeAttribute("data-fly-source");
  copy.removeAttribute("id");
  ghost.append(copy);
  document.body.append(ghost);

  // Mobilde üst satır sayfayla birlikte kaydığı için sepet ikonu ekranın çok üstünde kalabilir;
  // hedef ekranın üst kenarına sabitlenir ki uçuş görünür kalsın.
  const targetY = Math.max(end.top + end.height / 2, 24);
  const dx = end.left + end.width / 2 - (left + size / 2);
  const dy = targetY - (top + size / 2);
  // Orta noktada yukarı doğru bir kavis. Yatay mesafeyle büyür; sepet zaten yukarıda olduğu için
  // küçük tutulur, yoksa görsel ekranın üstünden çıkar.
  const lift = Math.min(60, Math.abs(dx) * 0.15 + 16);

  const remove = () => ghost.remove();
  ghost
    .animate(
      [
        { translate: "0 0", scale: 1, opacity: 1 },
        { translate: `${dx * 0.45}px ${dy * 0.45 - lift}px`, scale: 0.6, opacity: 1, offset: 0.5 },
        { translate: `${dx}px ${dy}px`, scale: 0.12, opacity: 0.5 },
      ],
      { duration: FLIGHT_MS, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
    )
    .finished.then(remove, remove);
}
