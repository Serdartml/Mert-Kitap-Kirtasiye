"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTree, LayoutDashboard, Mail, Package } from "lucide-react";

const links = [
  { href: "/yonetim", label: "Özet", icon: LayoutDashboard, exact: true },
  { href: "/yonetim/urunler", label: "Ürünler", icon: Package },
  { href: "/yonetim/kategoriler", label: "Kategoriler", icon: FolderTree },
  { href: "/yonetim/mesajlar", label: "Mesajlar", icon: Mail },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Yönetim menüsü">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold ${
                  active ? "bg-brand-500 text-ink" : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <link.icon size={18} aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
