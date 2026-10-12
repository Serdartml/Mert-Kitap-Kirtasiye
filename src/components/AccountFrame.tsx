import Link from "next/link";
import { Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { logout } from "@/actions/account";

export type AccountSection = "siparisler" | "favoriler" | "adresler" | "profil";

const sections = [
  { key: "siparisler", href: "/hesabim", label: "Siparişlerim", icon: Package },
  { key: "favoriler", href: "/hesabim/favoriler", label: "Favorilerim", icon: Heart },
  { key: "adresler", href: "/hesabim/adresler", label: "Adreslerim", icon: MapPin },
  { key: "profil", href: "/hesabim/profil", label: "Profil", icon: UserRound },
] as const;

interface AccountFrameProps {
  user: { name: string | null; email: string; role: string };
  active: AccountSection;
  // Sayfa genişliği: favoriler ızgara olduğundan geniş, diğerleri dar okunur.
  wide?: boolean;
  children: React.ReactNode;
}

// Hesabım sayfalarının ortak çerçevesi: başlık, kullanıcı bilgisi, çıkış ve bölüm sekmeleri.
// Her sayfa kendi içinde oturumu doğrular (requireUser) ve kullanıcıyı buraya verir.
export default function AccountFrame({ user, active, wide = false, children }: AccountFrameProps) {
  return (
    <div className={`container-page py-6 md:py-10 ${wide ? "" : "max-w-3xl"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            <span className="marker">Hesabım</span>
          </h1>
          <p className="mt-2 text-sm">
            {user.name && <span className="font-bold">{user.name} · </span>}
            <span className="break-all text-neutral-600">{user.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "ADMIN" && (
            <Link href="/yonetim" className="btn btn-outline py-2.5">
              Yönetim Paneli
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="btn btn-outline py-2.5">
              <LogOut size={16} aria-hidden /> Çıkış Yap
            </button>
          </form>
        </div>
      </div>

      {/* Bölüm sekmeleri: mobilde tek satır, yatay kayar. */}
      <nav aria-label="Hesap bölümleri" className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {sections.map((section) => {
            const current = section.key === active;
            return (
              <li key={section.key}>
                <Link
                  href={section.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-bold ${
                    current ? "border-brand-500 bg-brand-500 text-ink" : "border-neutral-300 hover:border-fg"
                  }`}
                >
                  <section.icon size={16} aria-hidden /> {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
