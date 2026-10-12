import { ViewTransition } from "react";

// Mağaza sayfaları arasında geçişte içerik kısa bir çapraz solma ile değişir (globals.css, .page-in/.page-out).
// Şablon (template) her gezintide yeniden kurulduğundan giren/çıkan sayfa buradan animasyon alır; layout'taki
// üst şerit, menü ve altbilgi hiç oynamaz. Tarayıcı View Transitions API'sini desteklemiyorsa sayfa
// animasyonsuz açılır. "Hareketi azalt" açıkken süreler sıfırlanır (globals.css).
export default function StoreTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
