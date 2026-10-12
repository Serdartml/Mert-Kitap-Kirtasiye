// Panel sayfaları oturumu ve önbelleksiz veriyi istek anında okur. Bu dosya her sayfayı otomatik bir
// <Suspense> içine alır: sayfalar arası geçişte veri gelene kadar bu iskelet görünür (Next'in
// "anında gezinme" denetimi de bunu ister; yoksa geliştirme sunucusunda hata katmanı açılır).
export default function PanelLoading() {
  return (
    <div role="status" aria-label="Yükleniyor" className="animate-pulse">
      <div className="h-8 w-40 rounded-md bg-neutral-200" />
      <div className="mt-6 h-28 w-full rounded-xl bg-neutral-200" />
      <div className="mt-3 h-28 w-full rounded-xl bg-neutral-200" />
    </div>
  );
}
