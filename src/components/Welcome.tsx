import type { CSSProperties } from "react";
import CategoryArt from "./CategoryArt";
import { LogoArt } from "./Logo";
import WelcomeDismiss from "./WelcomeDismiss";

// Karşılama ekranı: site ana sayfadan açıldığında oynar (2,4 sn); son gösterimin üstünden 30 dakika
// geçmeden yeniden oynamaz. Denemek için adresin sonuna ?karsilama eklenir, her seferinde oynar.
// Sayfa altta normal yüklenir; bu yalnızca üstünü örten bir katmandır. Kapatmak için StoreLayout'taki
// <Welcome /> satırını kaldırmak yeterli. Animasyonlar globals.css içinde (.welcome).

export const WELCOME_ID = "karsilama";

// React devreye girmeden önce çalışır ki katman ilk boyamada yerinde olsun. Son gösterim zamanı
// localStorage'da tutulur: telefonda sekmeler günlerce açık kaldığı için "sekme oturumu" bir ziyareti
// iyi tanımlamıyor. İstemci tarafı gezinmede betik çalışmaz, yani başka sayfadan ana sayfaya dönen
// ziyaretçi karşılamayı görmez. "Hareketi azalt" açıkken de tam haliyle oynar (globals.css).
const REPLAY_AFTER_MS = 30 * 60 * 1000;

const welcomeInitScript = `(function(){try{if(location.pathname!=="/")return;var k="mk-karsilama";if(!/[?&]karsilama(=|&|$)/.test(location.search)){try{if(Date.now()-(+localStorage.getItem(k)||0)<${REPLAY_AFTER_MS})return}catch(e){}}try{localStorage.setItem(k,String(Date.now()))}catch(e){}document.documentElement.dataset.welcome="play"}catch(e){}})()`;

// Köşelerden içeri süzülen çizimler: nereden geldikleri ve durdukları yer.
const items = [
  { slug: "kirtasiye", place: "left-[4%] top-[12%] -rotate-12 sm:top-[8%]", from: ["-70%", "-70%", "-50deg"], delay: "0s" },
  { slug: "kultur-kitaplari", place: "right-[4%] top-[14%] rotate-6 sm:top-[10%]", from: ["70%", "-70%", "40deg"], delay: "0.1s" },
  { slug: "sanatsal", place: "bottom-[14%] left-[5%] rotate-6 sm:bottom-[10%]", from: ["-70%", "70%", "45deg"], delay: "0.2s" },
  { slug: "hazirlik-kitaplari", place: "bottom-[12%] right-[5%] -rotate-6 sm:bottom-[8%]", from: ["70%", "70%", "-45deg"], delay: "0.3s" },
];

export default function Welcome() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: welcomeInitScript }} />
      {/*
        İki katman: dıştaki siyah, içteki sarı. Kapanırken ikisi de daire olarak küçülür, sarı olan 8px
        daha küçük kalır; böylece dairenin siyah bir kenarı olur ve sarı vitrinin üstünde de seçilir.
      */}
      <div id={WELCOME_ID} aria-hidden className="welcome fixed inset-0 z-[100] bg-ink">
        <div className="welcome-surface theme-fixed pattern-dots absolute inset-0 grid place-items-center overflow-hidden bg-brand-500">
        {items.map((item) => (
          <div
            key={item.slug}
            // Genişlik ekranın kısa kenarına göre: dik telefonda büyük, yatık telefonda logoya değmeyecek kadar küçük.
            className={`welcome-item absolute w-[min(40vw,30vh)] ${item.place}`}
            style={
              {
                "--from-x": item.from[0],
                "--from-y": item.from[1],
                "--from-rotate": item.from[2],
                "--delay": item.delay,
              } as CSSProperties
            }
          >
            <CategoryArt rootSlug={item.slug} className="w-full" />
          </div>
        ))}

        <div className="relative flex flex-col items-center gap-4 px-6">
          <div className="welcome-logo rounded-2xl bg-ink px-5 py-4 shadow-xl sm:px-7 sm:py-5">
            <LogoArt className="h-12 min-[400px]:h-14 sm:h-16 md:h-20" />
          </div>
          <p className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            <span className="welcome-marker">Hoş geldiniz</span>
          </p>
        </div>
        </div>
      </div>
      <WelcomeDismiss targetId={WELCOME_ID} />
    </>
  );
}
