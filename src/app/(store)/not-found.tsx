import Link from "next/link";
import { EraserArt } from "@/components/SceneArt";

// 404: yazının sağ yarısı silgiyle silinmiş; silgi ve kırıntıları silinen uçta durur.
export default function NotFound() {
  return (
    <div className="container-page py-14 text-center sm:py-20">
      <div className="relative mx-auto w-fit">
        <p
          aria-hidden
          className="text-[7.5rem] font-extrabold leading-none tracking-tight [-webkit-mask-image:linear-gradient(100deg,#000_42%,rgb(0_0_0/0.12)_68%,transparent_86%)] [mask-image:linear-gradient(100deg,#000_42%,rgb(0_0_0/0.12)_68%,transparent_86%)] sm:text-[11rem]"
        >
          404
        </p>
        <div aria-hidden className="theme-fixed absolute -right-6 bottom-1 w-20 rotate-[-18deg] animate-float sm:-right-10 sm:bottom-3 sm:w-28">
          <EraserArt className="w-full" />
        </div>
        {/* Silgi kırıntıları */}
        <span aria-hidden className="absolute bottom-0 right-[30%] h-1.5 w-3 rotate-12 rounded-full bg-neutral-400" />
        <span aria-hidden className="absolute -bottom-2 right-[18%] h-1.5 w-2 -rotate-12 rounded-full bg-neutral-400" />
        <span aria-hidden className="absolute -bottom-1 right-[44%] h-1 w-2 rotate-45 rounded-full bg-neutral-300" />
      </div>

      <p className="mt-4 -rotate-2 font-hand text-2xl text-neutral-500">biri bu sayfayı silmiş…</p>
      <h1 className="mt-2 text-2xl font-extrabold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-neutral-600">Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir.</p>
      <Link href="/" className="btn btn-primary mt-6">Ana Sayfaya Dön</Link>
    </div>
  );
}
