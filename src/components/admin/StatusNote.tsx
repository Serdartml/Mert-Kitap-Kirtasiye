const messages: Record<string, { text: string; tone: "ok" | "warn" }> = {
  kaydedildi: { text: "Kaydedildi.", tone: "ok" },
  silindi: { text: "Silindi.", tone: "ok" },
  "toplu-silindi": { text: "{adet} ürün silindi.", tone: "ok" },
  "toptanci-yapildi": { text: "{adet} marka toptancı olarak işaretlendi; adları sitede müşteriye gösterilmeyecek.", tone: "ok" },
  "marka-yapildi": { text: "{adet} marka tekrar sitede görünür.", tone: "ok" },
  "marka-secilmedi": { text: "Önce listeden en az bir marka seçin.", tone: "warn" },
  "gorsel-eklendi": { text: "{adet} görsel eklendi.", tone: "ok" },
  "gorsel-silindi": { text: "Görsel silindi.", tone: "ok" },
  "one-cikarildi": { text: "{adet} ürün ana sayfada öne çıkanlara eklendi.", tone: "ok" },
  "one-cikarilmadi": { text: "{adet} ürün öne çıkanlardan kaldırıldı.", tone: "ok" },
  "cok-fazla": { text: "Tek seferde en fazla 5000 ürün seçilebilir; hiçbir ürün silinmedi. Daha fazlası için filtreleyip tüm sonuçları seçin.", tone: "warn" },
  gecersiz: { text: "Bu sipariş o duruma geçirilemez; sayfayı yenileyip tekrar bakın.", tone: "warn" },
  yayinlandi: { text: "Yorum yayınlandı.", tone: "ok" },
  markadolu: { text: "Bu marka silinemedi: markaya bağlı ürünler var. Önce o ürünlerin markasını değiştirin.", tone: "warn" },
  dolu: { text: "Bu kategori silinemedi: içinde ürün veya alt kategori var. Önce onları taşıyın.", tone: "warn" },
};

// İşlem sonrası yönlendirmedeki ?durum= değerine göre kısa bilgi satırı.
export default function StatusNote({ status, count }: { status?: string; count?: string }) {
  const message = status ? messages[status] : undefined;
  if (!message) return null;
  // Toplu işlemlerde mesajdaki {adet} yerine sayı yazılır (sayı yoksa "Seçilen").
  const amount = Number.parseInt(count ?? "", 10);
  const text = message.text.replace("{adet}", amount >= 0 ? String(amount) : "Seçilen");

  return (
    <p
      role="status"
      className={`mb-4 rounded-lg border p-3 text-sm font-semibold ${
        message.tone === "ok"
          ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
          : "border-brand-500 bg-brand-50"
      }`}
    >
      {text}
    </p>
  );
}
