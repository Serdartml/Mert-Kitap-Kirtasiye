import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <ComingSoon
      title="Üyelik çok yakında"
      text="Giriş ve kayıt özelliği üzerinde çalışıyoruz. Şimdilik üye olmadan ürünleri inceleyip sepetinize ekleyebilirsiniz."
    />
  );
}
