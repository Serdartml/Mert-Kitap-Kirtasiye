import { useId } from "react";
import Link from "next/link";
import { site } from "@/lib/site";

// Mağaza logosu: tabeladaki logonun fotoğrafından yeniden çizildi (satır içi SVG).
// Solda üst üste üç "kalem uçlu kitap" (mavi, pembe, sarı), sağda MERT yazısı; sarı kitabın alt kolu
// uzayıp KİTAP - KIRTASİYE yazısının çizgisine dönüşür. Logo tabeladaki gibi siyah zemin için
// tasarlandığından her temada siyah bir plaka üstünde gösterilir.
// Renkler fotoğraftan tahmin edildi; asıl renk kodları gelirse yalnızca bu üç sabit değişir.
const BLUE = "#6bb5e6";
const PINK = "#e8478f";
const YELLOW = "#e9e61c";
const PAGE = "#ffffff";

const STROKE = 16;

interface BookProps {
  y: number;
  color: string;
  // Kapalı uç solda mı (mavi, sarı) sağda mı (pembe).
  spineLeft: boolean;
  from: number;
  to: number;
  // Alt kolun bittiği x; verilmezse üst kolla aynı.
  tailTo?: number;
}

// Bir kitap: kalın U biçimli kapak, içinde üç beyaz sayfa çizgisi, üst kolun ucunda kalem ucu.
function Book({ y, color, spineLeft, from, to, tailTo }: BookProps) {
  const top = y + STROKE / 2;
  const r = 15;
  const open = spineLeft ? to : from; // açık uç (kalem ucu burada)
  const spine = spineLeft ? from + STROKE / 2 : to - STROKE / 2;
  const dir = spineLeft ? 1 : -1;
  const sweep = spineLeft ? 0 : 1;

  const cover = [
    `M${open} ${top}`,
    `H${spine + dir * r}`,
    `a${r} ${r} 0 0 ${sweep} ${-dir * r} ${r}`,
    `v20`,
    `a${r} ${r} 0 0 ${sweep} ${dir * r} ${r}`,
    `H${tailTo ?? open}`,
  ].join(" ");

  const lineStart = spineLeft ? spine + 24 : from + 10;
  const lineEnd = spineLeft ? to - 10 : spine - 24;

  return (
    <g>
      <path d={cover} fill="none" stroke={color} strokeWidth={STROKE} />
      {/* Kalem ucu: açık renkli ahşap ve kapak renginde uç */}
      <path d={`M${open} ${y}l${dir * 15} ${STROKE / 2}l${-dir * 15} ${STROKE / 2}z`} fill="#f4ecd6" />
      <path d={`M${open + dir * 9} ${y + 3.2}l${dir * 6} ${4.8}l${-dir * 6} ${4.8}z`} fill={color} />
      {[15, 25, 35].map((offset) => (
        <path key={offset} d={`M${lineStart} ${top + offset}H${lineEnd}`} stroke={PAGE} strokeWidth="4" />
      ))}
    </g>
  );
}

function BookStack() {
  return (
    <>
      <Book y={6} color={BLUE} spineLeft from={10} to={205} />
      <Book y={88} color={PINK} spineLeft={false} from={8} to={232} />
      {/* Alt kol 385'e kadar uzar ve sloganın çizgisi olur. */}
      <Book y={170} color={YELLOW} spineLeft from={10} to={262} tailTo={385} />
    </>
  );
}

interface LogoProps {
  // Yükseklik sınıfları; genişlik orana göre kendiliğinden gelir.
  className?: string;
  href?: string;
}

export default function Logo({ className = "h-6 min-[360px]:h-[30px] md:h-10", href = "/" }: LogoProps) {
  const clipId = useId();

  return (
    <Link href={href} aria-label={`${site.name} ana sayfa`} className="inline-flex shrink-0 rounded-lg bg-ink px-2 py-1.5 md:px-3 md:py-2">
      <svg viewBox="-10 0 1056 244" role="img" aria-label={site.name} className={`w-auto ${className}`}>
        <BookStack />

        {/* MERT: geometrik kalın harfler, yazı tipine bağlı kalmasın diye çizim olarak. */}
        <g transform="translate(378 6)" fill={YELLOW}>
          <clipPath id={clipId}>
            <rect x="-10" y="0" width="240" height="180" />
          </clipPath>
          {/* M: eğik bacaklı, sivri tepeli. Kalın çizgi köşeleri taşar; üstten ve alttan kırpılır. */}
          <polyline
            clipPath={`url(#${clipId})`}
            points="24,200 50,35 110,150 170,35 196,200"
            fill="none"
            stroke={YELLOW}
            strokeWidth="44"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
          />
          {/* E */}
          <path d="M238 0h112v40h-62v30h56v38h-56v32h62v40h-112z" />
          {/* R: gövde + kavis (içi boş) + bacak */}
          <path fillRule="evenodd" d="M372 0h78a54 54 0 0 1 0 108h-28v72h-50zM422 40v30h26a15 15 0 0 0 0-30z" />
          <path d="M428 104h48l34 76h-54z" />
          {/* T */}
          <path d="M507 0h150v44h-50v136h-50v-136h-50z" />
        </g>

        {/* Slogan: sarı kitabın çizgisiyle aynı hizada, ardından kısa bir çizgi daha. */}
        <text
          x="398"
          y="238"
          fill={YELLOW}
          fontSize="30"
          fontWeight="800"
          textLength="590"
          lengthAdjust="spacing"
          style={{ fontFamily: "inherit" }}
        >
          KİTAP - KIRTASİYE
        </text>
        <rect x="1000" y="220" width="36" height="16" fill={YELLOW} />
      </svg>
    </Link>
  );
}

// Yalnızca kitap yığını: dar alanlar için (yönetim paneli başlığı gibi).
export function LogoMark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="-10 0 290 244" aria-hidden className={`w-auto ${className}`}>
      <Book y={6} color={BLUE} spineLeft from={10} to={205} />
      <Book y={88} color={PINK} spineLeft={false} from={8} to={232} />
      <Book y={170} color={YELLOW} spineLeft from={10} to={262} />
    </svg>
  );
}
