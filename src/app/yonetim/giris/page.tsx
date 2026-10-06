import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/admin/LoginForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Yönetim Girişi",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-raised p-6 shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{site.name}</p>
        <h1 className="mb-6 mt-1 text-2xl font-extrabold">
          <span className="marker">Yönetim Paneli</span>
        </h1>
        <LoginForm />
        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-neutral-500 hover:text-fg">
          ← Siteye dön
        </Link>
      </div>
    </main>
  );
}
