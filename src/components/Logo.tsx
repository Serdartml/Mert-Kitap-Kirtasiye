import Link from "next/link";
import { site } from "@/lib/site";

interface LogoProps {
  onDark?: boolean;
}

// Logo dosyası henüz gelmedi; kesik çizgili kutu onun yerini tutuyor.
// Logo geldiğinde public/logo.svg olarak ekleyip kutuyu <Image src="/logo.svg" ... /> ile değiştirin
// (gerekirse yandaki yazıyı da kaldırın). Header ve footer buradan beslenir.
export default function Logo({ onDark = false }: LogoProps) {
  return (
    <Link href="/" aria-label={`${site.name} ana sayfa`} className="flex shrink-0 items-center gap-2.5">
      <span
        aria-hidden
        className={`grid h-10 w-14 place-items-center rounded-md border-2 border-dashed text-[9px] font-bold tracking-widest ${
          onDark ? "border-neutral-600 text-neutral-500" : "border-neutral-300 text-neutral-400"
        }`}
      >
        LOGO
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-xl font-extrabold tracking-tight ${onDark ? "text-white" : "text-ink"}`}>MERT</span>
        <span
          className={`mt-1 text-[10px] font-bold tracking-[0.18em] ${onDark ? "text-brand-500" : "text-neutral-500"}`}
        >
          KİTAP · KIRTASİYE
        </span>
      </span>
    </Link>
  );
}
