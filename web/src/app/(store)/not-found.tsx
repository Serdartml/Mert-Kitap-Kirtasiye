import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-500">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-neutral-600">Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir.</p>
      <Link href="/" className="btn btn-primary mt-6">Ana Sayfaya Dön</Link>
    </div>
  );
}
