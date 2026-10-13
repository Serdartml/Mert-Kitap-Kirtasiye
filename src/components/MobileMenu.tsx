"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { categoryIcons, fallbackCategoryIcon } from "@/lib/category-icons";
import { site } from "@/lib/site";

interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  children: { id: string; slug: string; name: string }[];
}

// Süreler (ms). Panel animasyonu bitince menü gizlenir; kategori akordeonu Web Animations ile yüksekliği canlandırır.
const PANEL_MS = 420;
const ACCORDION_MS = 380;
// iOS çekmece hissi: hızlı başlar, uzun ve yumuşak biter (aşırı sert "easeOutQuint" değil).
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function CategoryIcon({ slug, open }: { slug: string; open: boolean }) {
  const Icon = categoryIcons[slug] ?? fallbackCategoryIcon;
  return (
    // Kategori açılınca ikon kutusu hafifçe dönüp büyür.
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-ink transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
        open ? "rotate-[-8deg] scale-110" : ""
      }`}
    >
      <Icon size={16} aria-hidden />
    </span>
  );
}

// Mobil kategori menüsü. Akıcılık için:
//  - Menü sayfada HER ZAMAN bulunur (gizliyken görünmez ve odaklanamaz); açılırken bileşen bağlanmaz, yalnızca iki katmanın
//    (panel: transform, arka plan: opacity) geçişi başlar. Bağlama maliyeti ilk karelerde takılma yapıyordu.
//  - Yalnızca transform (panel) ve opacity (arka plan, kategoriler) canlanır; sayfa kilidi ve arka plan animasyonlarının
//    durdurulması animasyonun ilk karesini ağırlaştırmasın diye ya doğrudan birkaç öğeye uygulanır ya da animasyon sonrasına bırakılır.
//  - Kategori akordeonu yüksekliği Web Animations ile canlandırır; ters yöne dokunulursa mevcut yükseklikten devam eder.
// Birden çok kategori açık olabilir. Kapalı kategorinin bağlantıları odaklanamaz (inert).
export default function MobileMenu({ categories }: { categories: MenuCategory[] }) {
  // visible: menü ekranda (açılış/kapanış animasyonu dahil); shown: açık konumda.
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wrappers = useRef(new Map<string, HTMLDivElement>());
  // Akordeon animasyonu için: son dokunulan kategori, önceki yükseklik ve hedef durum.
  const pending = useRef<{ id: string; from: number; open: boolean } | null>(null);

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setVisible(true);
    // Gizli konumdan açık konuma geçiş bir sonraki karede başlar.
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  };

  const close = useCallback(() => {
    setShown(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setVisible(false), PANEL_MS);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(closeTimer.current);
      clearTimeout(focusTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // Sayfa kilidi (body overflow) tüm belgeyi yeniden yerleştirdiği için açılış animasyonunun İLK karesinde değil, animasyon
    // bittikten sonra uygulanır; animasyon sırasında arka plan katmanı (touch-action: none) kaydırmayı zaten engeller.
    // Arkadaki sürekli animasyonlar yalnızca birkaç öğede doğrudan durdurulur (belge geneli stil geçersizleştirmesi yok).
    const animated = [...document.querySelectorAll<HTMLElement>(".marquee-track, .animate-float")];
    animated.forEach((element) => (element.style.animationPlayState = "paused"));
    const lockTimer = setTimeout(() => (document.body.style.overflow = "hidden"), PANEL_MS);
    window.addEventListener("keydown", onKeyDown);
    // Odak, açılış animasyonu bittikten sonra verilir (animasyon sırasında odak değişimi kare atlatabiliyordu).
    focusTimer.current = setTimeout(() => closeButton.current?.focus({ preventScroll: true }), PANEL_MS - 60);
    return () => {
      clearTimeout(lockTimer);
      document.body.style.overflow = "";
      animated.forEach((element) => element.style.removeProperty("animation-play-state"));
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer.current);
    };  }, [visible, close]);

  const toggle = (id: string) => {
    const wrapper = wrappers.current.get(id);
    pending.current = { id, from: wrapper ? wrapper.getBoundingClientRect().height : 0, open: !expanded.has(id) };
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Durum değiştikten sonra (yeni yükseklik hesaplanınca) eski yükseklikten yenisine canlandır.
  useLayoutEffect(() => {
    const change = pending.current;
    if (!change) return;
    pending.current = null;
    const wrapper = wrappers.current.get(change.id);
    if (!wrapper) return;
    wrapper.getAnimations().forEach((animation) => animation.cancel());
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = change.open ? wrapper.scrollHeight : 0;
    if (Math.abs(to - change.from) < 1) return;
    wrapper.animate([{ height: `${change.from}px` }, { height: `${to}px` }], { duration: ACCORDION_MS, easing: EASE });
  }, [expanded]);

  return (
    <>
      {/* icon-menu: dokununca / üstüne gelince üç çizgi dalga gibi kayar (globals.css, "Başlık ikonları"; IconMotion). */}
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={visible && shown}
        onClick={openMenu}
        className="icon-menu -ml-2 grid size-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-neutral-100 active:bg-brand-500 active:text-ink md:hidden"
      >
        <Menu size={24} />
      </button>

      <div
        // Gizliyken: görünmez, tıklanamaz, odaklanamaz ve ekran okuyucuya kapalı (yine de sayfada durur).
        {...(visible ? { role: "dialog", "aria-modal": true, "aria-label": "Menü" } : { "aria-hidden": true })}
        inert={!visible}
        className={`fixed inset-0 z-50 md:hidden ${visible ? "" : "invisible pointer-events-none"}`}
      >
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={close}
          tabIndex={visible ? 0 : -1}
          style={{ transitionDuration: `${PANEL_MS}ms` }}
          className={`absolute inset-0 touch-none overscroll-contain bg-black/70 transition-opacity ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
        />

        <div
          style={{ transitionDuration: `${PANEL_MS}ms`, transitionTimingFunction: EASE }}
          className={`absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col border-r border-neutral-200 bg-raised shadow-2xl transition-transform motion-reduce:transition-none ${
            shown ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="theme-fixed flex items-center justify-between bg-brand-500 px-4 py-3">
            <span className="text-base font-extrabold">Kategoriler</span>
            <button
              ref={closeButton}
              type="button"
              aria-label="Menüyü kapat"
              onClick={close}
              className="grid size-10 place-items-center rounded-lg transition-transform duration-300 active:rotate-90 motion-reduce:transition-none"
            >
              <X size={22} />
            </button>
          </div>

          {/* Kategoriler ve alt bağlantılar tek kayan alandadır: bir kategori açılınca alttaki bağlantılar da aşağı kayar. */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <nav aria-label="Kategoriler">
              <ul className="divide-y divide-neutral-200">
                {categories.map((category, index) => {
                  const isOpen = expanded.has(category.id);
                  return (
                    // data-cat: kategori renginde sol şerit, renkli ikon ve açık hâlde açık ton zemin (globals.css, "Kategori renkleri").
                    <li
                      key={category.id}
                      data-cat={category.slug}
                      // Açılışta kategoriler sırayla soldan belirir.
                      style={{ transitionDelay: shown ? `${90 + index * 40}ms` : "0ms" }}
                      className={`transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none ${
                        shown ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`menu-kategori-${category.id}`}
                        onClick={() => toggle(category.id)}
                        className={`flex w-full items-center justify-between border-l-4 border-brand-500 px-4 py-3.5 text-left text-[15px] font-bold transition-colors duration-300 active:bg-brand-100 motion-reduce:transition-none ${
                          isOpen ? "bg-brand-50" : ""
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <CategoryIcon slug={category.slug} open={isOpen} />
                          {category.name}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-neutral-400 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Kapalı: yükseklik 0; açık: otomatik. Geçiş Web Animations ile (useLayoutEffect) canlandırılır. */}
                      <div
                        id={`menu-kategori-${category.id}`}
                        ref={(element) => {
                          if (element) wrappers.current.set(category.id, element);
                          else wrappers.current.delete(category.id);
                        }}
                        inert={!isOpen}
                        className={`overflow-hidden ${isOpen ? "" : "h-0"}`}
                      >
                        <ul className="border-l-4 border-brand-500 bg-brand-50 pb-2">
                          {[{ id: "tumu", slug: category.slug, name: `Tüm ${category.name}`, strong: true }, ...category.children.map((child) => ({ ...child, strong: false }))].map(
                            (item, childIndex) => (
                              <li
                                key={item.id}
                                style={{ transitionDelay: isOpen ? `${70 + childIndex * 40}ms` : "0ms" }}
                                className={`transition-opacity duration-300 ease-out motion-reduce:transition-none ${isOpen ? "opacity-100" : "opacity-0"}`}
                              >
                                <Link
                                  href={`/kategori/${item.slug}`}
                                  onClick={close}
                                  className={`block px-6 py-2.5 text-sm transition-colors active:bg-brand-200 ${item.strong ? "font-bold" : ""}`}
                                >
                                  {item.name}
                                </Link>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="space-y-1 border-t border-neutral-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm font-semibold">
              <Link href="/okul-listeleri" onClick={close} className="block py-2">Okula Dönüş Listeleri</Link>
              <Link href="/siparis-takip" onClick={close} className="block py-2">Sipariş Takibi</Link>
              <Link href="/hakkimizda" onClick={close} className="block py-2">Hakkımızda</Link>
              <Link href="/iletisim" onClick={close} className="block py-2">İletişim</Link>
              <a href={site.phoneHref} className="btn btn-dark mt-2 w-full">
                <Phone size={16} /> {site.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
