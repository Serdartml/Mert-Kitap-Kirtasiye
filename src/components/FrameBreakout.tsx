"use client";

import { useEffect } from "react";

// PayTR, ödemeden sonra müşteriyi başarı / başarısızlık adresine çerçevenin (iframe) içinden de yönlendirebilir.
// Sayfa bir çerçevenin içinde açıldıysa üst pencereyi bu adrese taşır; site sayfası çerçeve içinde iç içe görünmez.
export default function FrameBreakout() {
  useEffect(() => {
    if (window.top && window.top !== window.self) window.top.location.href = window.location.href;
  }, []);
  return null;
}
