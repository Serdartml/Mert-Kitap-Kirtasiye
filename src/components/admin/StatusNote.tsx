const messages: Record<string, { text: string; tone: "ok" | "warn" }> = {
  kaydedildi: { text: "Kaydedildi.", tone: "ok" },
  silindi: { text: "Silindi.", tone: "ok" },
  dolu: { text: "Bu kategori silinemedi: içinde ürün veya alt kategori var. Önce onları taşıyın.", tone: "warn" },
};

// İşlem sonrası yönlendirmedeki ?durum= değerine göre kısa bilgi satırı.
export default function StatusNote({ status }: { status?: string }) {
  const message = status ? messages[status] : undefined;
  if (!message) return null;

  return (
    <p
      role="status"
      className={`mb-4 rounded-lg border p-3 text-sm font-semibold ${
        message.tone === "ok"
          ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
          : "border-brand-500 bg-brand-50"
      }`}
    >
      {message.text}
    </p>
  );
}
