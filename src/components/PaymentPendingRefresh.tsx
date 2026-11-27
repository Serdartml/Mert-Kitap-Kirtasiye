"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Kartla ödemeden dönüldüğünde PayTR'nin bildirimi birkaç saniye geç gelebilir: sipariş "ödeme bekleniyor"dayken
// sayfa kısa aralıklarla yenilenir (en fazla ~1 dakika), bildirim gelince "ödendi" görünür.
export default function PaymentPendingRefresh() {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= 20) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
