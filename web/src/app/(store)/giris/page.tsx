import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Giriş Yap",
  robots: { index: false },
};

// Üyelik arayüzü ertelendi. Şema (User, Session) ve lib/auth.ts hazır; form buraya gelecek.
export default function LoginPage() {
  return (
    <ComingSoon
      title="Üyelik çok yakında"
      text="Giriş ve kayıt özelliği üzerinde çalışıyoruz. Şimdilik üye olmadan ürünleri inceleyip sepetinize ekleyebilirsiniz."
    />
  );
}
