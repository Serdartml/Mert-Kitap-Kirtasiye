"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { site } from "@/lib/site";

interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  children: { id: string; slug: string; name: string }[];
}

export default function MobileMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Menü açıkken arkadaki sayfa kaymasın.
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-2 grid size-10 shrink-0 place-items-center rounded-lg hover:bg-neutral-100 md:hidden"
      >
        <Menu size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" aria-label="Menüyü kapat" onClick={close} className="absolute inset-0 bg-black/50" />

          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-surface shadow-xl">
            <div className="theme-fixed flex items-center justify-between bg-brand-500 px-4 py-3">
              <span className="text-base font-extrabold">Kategoriler</span>
              <button type="button" aria-label="Menüyü kapat" onClick={close} className="grid size-10 place-items-center rounded-lg">
                <X size={22} />
              </button>
            </div>

            <nav aria-label="Kategoriler" className="flex-1 overflow-y-auto overscroll-contain">
              <ul className="divide-y divide-neutral-200">
                {categories.map((category) => (
                  <li key={category.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                        {category.name}
                        <ChevronDown size={18} className="text-neutral-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <ul className="bg-neutral-50 pb-2">
                        <li>
                          <Link href={`/kategori/${category.slug}`} onClick={close} className="block px-6 py-2.5 text-sm font-bold">
                            Tüm {category.name}
                          </Link>
                        </li>
                        {category.children.map((child) => (
                          <li key={child.id}>
                            <Link href={`/kategori/${child.slug}`} onClick={close} className="block px-6 py-2.5 text-sm">
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-1 border-t border-neutral-200 p-4 text-sm font-semibold">
              <Link href="/hakkimizda" onClick={close} className="block py-2">Hakkımızda</Link>
              <Link href="/iletisim" onClick={close} className="block py-2">İletişim</Link>
              <a href={site.phoneHref} className="btn btn-dark mt-2 w-full">
                <Phone size={16} /> {site.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
