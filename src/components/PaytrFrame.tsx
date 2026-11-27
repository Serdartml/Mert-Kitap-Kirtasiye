"use client";

import Script from "next/script";

declare global {
  interface Window {
    iFrameResize?: (options: object, target: string) => void;
  }
}

// PayTR ödeme çerçevesi. Yükseklik, PayTR'nin kendi iframeResizer betiğiyle içeriğe göre ayarlanır (dokümandaki gibi).
export default function PaytrFrame({ src }: { src: string }) {
  return (
    <>
      <iframe
        id="paytriframe"
        src={src}
        title="PayTR güvenli ödeme"
        // Betik yüklenmezse de kart formu kesilmeden görünsün.
        style={{ width: "100%", minHeight: 600, border: 0 }}
        scrolling="no"
        allow="payment"
      />
      <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" onReady={() => window.iFrameResize?.({}, "#paytriframe")} />
    </>
  );
}
