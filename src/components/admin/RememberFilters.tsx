"use client";

import { useEffect } from "react";
import { FILTER_COOKIE } from "@/lib/admin-products";

// Ürün listesinde seçilen süzgeç ve kategoriyi çereze yazar (RememberSort ile aynı yöntem); menüden ürünlere yeniden
// girince ya da bir ürünü kaydedip dönünce liste aynı süzgeçle açılır. `value` boşsa süzgeç temizlenmiştir: çerez
// silinir. undefined: adres süzgeç içermiyor (çerezden okunmuştur), çereze dokunulmaz.
export default function RememberFilters({ value }: { value: string | undefined }) {
  useEffect(() => {
    if (value === undefined) return;
    const attributes = "path=/yonetim; samesite=lax";
    document.cookie = value ? `${FILTER_COOKIE}=${value}; ${attributes}; max-age=31536000` : `${FILTER_COOKIE}=; ${attributes}; max-age=0`;
  }, [value]);
  return null;
}
