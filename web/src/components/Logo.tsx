import Link from "next/link";
import { site } from "@/lib/site";

interface LogoProps {
  onDark?: boolean;
}

// GEÇİCİ: Gerçek logo dosyası gelene kadar kullanılan yazı logosu.
// Logo geldiğinde public/logo.svg olarak ekleyip bu bileşenin içini <Image> ile değiştirmek yeterli;
// header ve footer buradan beslenir.
export default function Logo({ onDark = false }: LogoProps) {
  return (
    <Link href="/" aria-label={`${site.name} ana sayfa`} className="flex shrink-0 items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-lg bg-brand-500 text-xl font-extrabold text-ink">
        M
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
