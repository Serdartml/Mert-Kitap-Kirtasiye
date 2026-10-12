import { ChevronRight, ClipboardCheck, ShoppingCart, Store, type LucideIcon } from "lucide-react";
import { site } from "@/lib/site";

// Sipariş akışı gerçekte böyle işler (actions/order.ts): sepet, bilgiler, stok ayrılır, mağazadan teslim ve
// ödeme mağazada. Akış değişirse (kargo, online ödeme) bu adımlar da güncellenmeli.
const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShoppingCart, title: "Sepete ekle", text: "Beğendiğin ürünleri sepetine at. Üye olmana gerek yok." },
  { icon: ClipboardCheck, title: "Siparişini ver", text: "Adını ve telefonunu yaz. Ürünlerin senin için ayrılır, hazır olunca telefonla haber veririz." },
  { icon: Store, title: "Mağazadan teslim al", text: `${site.address.district}'daki mağazamıza gel, ürünlerini al ve ödemeyi orada yap.` },
];

// Ana sayfadaki üç adımlı şerit. Mobilde alt alta, masaüstünde yan yana; kartlar arasında küçük oklar.
export default function HowItWorks() {
  return (
    <section className="container-page mt-12 md:mt-16" aria-labelledby="nasil-siparis">
      <h2 id="nasil-siparis" className="flex items-end text-xl font-extrabold md:text-2xl">
        <span className="marker">Nasıl sipariş verilir?</span>
        <span aria-hidden className="ml-3 -rotate-3 font-hand text-2xl font-bold leading-none text-neutral-500">üç adımda</span>
      </h2>
      <ol className="mt-5 grid gap-3 md:grid-cols-3 md:gap-6">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 rounded-2xl border border-neutral-200 bg-raised p-4 sm:p-5 md:block">
            {/* Büyük el yazısı numara, sarı lekenin üstünde. */}
            <span
              aria-hidden
              className="theme-fixed grid size-14 shrink-0 -rotate-6 place-items-center rounded-2xl bg-brand-500 font-hand text-4xl font-bold leading-none md:size-16 md:text-5xl"
            >
              {index + 1}
            </span>
            <div className="min-w-0 md:mt-4">
              <h3 className="flex items-center gap-2 text-base font-extrabold">
                <step.icon size={18} aria-hidden className="shrink-0" /> {step.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">{step.text}</p>
            </div>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-5 top-1/2 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full border border-neutral-200 bg-raised md:grid"
              >
                <ChevronRight size={16} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
