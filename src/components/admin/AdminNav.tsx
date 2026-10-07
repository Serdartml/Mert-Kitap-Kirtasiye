"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FolderTree, LayoutDashboard, Mail, Package } from "lucide-react";

const links = [
  { href: "/yonetim", label: "Özet", icon: LayoutDashboard, exact: true },
  { href: "/yonetim/siparisler", label: "Siparişler", icon: ClipboardList },
  { href: "/yonetim/urunler", label: "Ürünler", icon: Package },
  { href: "/yonetim/kategoriler", label: "Kategoriler", icon: FolderTree },
  { href: "/yonetim/mesajlar", label: "Mesajlar", icon: Mail },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Yönetim menüsü">
      {/* Mobilde beş bölüm de kaydırmadan görünür: eşit sütunlar, ikon üstte ad altta. */}
      <ul className="grid grid-cols-5 gap-1 md:flex md:flex-col">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="min-w-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-lg px-0.5 py-2 text-[11px] font-bold leading-tight md:flex-row md:gap-2.5 md:px-3 md:py-2.5 md:text-sm ${
                  active ? "bg-brand-500 text-ink" : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <link.icon size={18} aria-hidden />
                <span className="max-w-full truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
