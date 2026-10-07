import Link from "next/link";
import { User, UserCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const linkClass = "flex items-center gap-2 rounded-lg p-2 text-sm font-bold hover:bg-neutral-100 md:px-3 md:py-2";

// Oturum yokken (ve oturum okunurken) görünen bağlantı.
export function GuestAccountLink() {
  return (
    <Link href="/giris" aria-label="Giriş yap" className={linkClass}>
      <User size={22} />
      <span className="hidden lg:inline">Giriş Yap</span>
    </Link>
  );
}

// Çerez okuduğu için istek anında çalışır; Header'da <Suspense> içinde kullanılır.
export default async function AccountLink() {
  const user = await getCurrentUser();
  if (!user) return <GuestAccountLink />;

  return (
    <Link href="/hesabim" aria-label="Hesabım" className={linkClass}>
      <UserCheck size={22} />
      <span className="hidden lg:inline">Hesabım</span>
    </Link>
  );
}
