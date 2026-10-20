"use client";

import { useEffect } from "react";
import { SORT_COOKIE } from "@/lib/admin-products";

// Ürün listesinde seçilen sıralamayı çereze yazar; adreste sıralama yoksa sayfa onu kullanır (menüden ürünlere yeniden
// girince de sıralama korunur). `value` boşsa varsayılan sıralama seçilmiş demektir: çerez silinir. undefined: adres
// sıralama içermiyor, çereze dokunulmaz.
export default function RememberSort({ value }: { value: string | undefined }) {
  useEffect(() => {
    if (value === undefined) return;
    const attributes = "path=/yonetim; samesite=lax";
    document.cookie = value ? `${SORT_COOKIE}=${value}; ${attributes}; max-age=31536000` : `${SORT_COOKIE}=; ${attributes}; max-age=0`;
  }, [value]);
  return null;
}
