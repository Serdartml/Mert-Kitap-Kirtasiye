import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { adminLogout } from "@/actions/auth";
import AdminNav from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { requireAdmin } from "@/lib/auth";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "Yönetim", template: "%s | Yönetim" },
  robots: { index: false, follow: false },
};

// Yönetim sayfaları oturum çerezini ve önbelleksiz veriyi okur; hepsi bu <Suspense> içinde istek anında çalışır.
export default function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<p className="grid min-h-screen place-items-center text-sm text-neutral-500">Yükleniyor...</p>}>
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}

// Buradaki kontrol kabuğu korur. Sayfalar layout'u beklemeden çalıştığı için her sayfa ayrıca
// requireAdmin() çağırır.
async function PanelShell({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-50 md:grid md:grid-cols-[15rem_1fr]">
      <aside className="theme-fixed flex flex-col gap-4 bg-ink p-4 text-white md:sticky md:top-0 md:h-screen md:gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/yonetim" className="flex items-center gap-3 leading-tight">
            <LogoMark className="h-9" />
            <span>
              <span className="block text-lg font-extrabold">MERT</span>
              <span className="block text-[10px] font-bold tracking-[0.18em] text-brand-500">YÖNETİM PANELİ</span>
            </span>
          </Link>
          <span className="md:hidden">
            <ThemeToggle variant="onDark" />
          </span>
        </div>

        <AdminNav />

        <div className="space-y-2 text-sm md:mt-auto">
          <p className="hidden truncate text-xs text-neutral-400 md:block" title={user.email}>
            {user.email}
          </p>
          <div className="flex items-center gap-2 md:flex-col md:items-stretch">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 rounded-lg px-3 py-2 font-bold text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              <ExternalLink size={16} aria-hidden /> Siteyi gör
            </Link>
            <form action={adminLogout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-bold text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} aria-hidden /> Çıkış yap
              </button>
            </form>
            <span className="ml-auto hidden md:ml-0 md:block">
              <ThemeToggle variant="onDark" />
            </span>
          </div>
        </div>
        <p className="sr-only">{site.name}</p>
      </aside>

      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
