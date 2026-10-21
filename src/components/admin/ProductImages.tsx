"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { deleteProductImage, setPrimaryProductImage, uploadProductImages } from "@/actions/admin";
import ConfirmButton from "./ConfirmButton";

// En uzun kenar bu kadar pikselden büyükse küçültülür; Vercel'in 4,5 MB istek sınırına uyar ve görseller sunucuda
// ayrıca işlenmeden (ücretli görsel optimizasyonu kullanılmadan) sunulduğu için sayfalar hafif kalır.
const MAX_SIDE = 1000;
const MAX_FILES = 8;

// Görseli tarayıcıda küçültüp WebP'ye çevirir. Çözülemeyen biçimde (ör. AVIF desteği yok) özgün dosya aynen gider.
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

interface ProductImagesProps {
  productId: string;
  images: { id: string; url: string }[];
  // R2 ortam değişkenleri tanımlı mı (sunucuda hesaplanır).
  configured: boolean;
}

export default function ProductImages({ productId, images, configured }: ProductImagesProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function upload() {
    const picked = [...(input.current?.files ?? [])];
    if (picked.length === 0) return setError("Önce bir görsel seçin.");
    if (images.length + picked.length > MAX_FILES) return setError(`Bir ürüne en fazla ${MAX_FILES} görsel eklenebilir.`);
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", productId);
      for (const file of await Promise.all(picked.map(shrink))) formData.append("files", file);
      const result = await uploadProductImages({ error: "" }, formData);
      // Başarılıysa action yönlendirir ve sayfa yenilenir; buraya yalnızca hata dönerse gelinir.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section className="mb-6 max-w-3xl rounded-xl border border-neutral-200 bg-raised p-5">
      <h2 className="text-sm font-extrabold">Görseller</h2>

      {images.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
                <Image src={image.url} alt="" fill sizes="160px" unoptimized={image.url.startsWith("/gorsel/")} className="object-contain" />
                {index === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-extrabold text-ink">Kapak</span>}
              </div>
              <div className="flex gap-1.5">
                {index > 0 && (
                  <form action={setPrimaryProductImage.bind(null, image.id)} className="flex-1">
                    <button type="submit" className="flex min-h-9 w-full items-center justify-center gap-1 rounded-lg border border-neutral-300 text-xs font-bold hover:border-fg">
                      <Star size={13} aria-hidden /> Kapak yap
                    </button>
                  </form>
                )}
                <form action={deleteProductImage.bind(null, image.id)}>
                  <ConfirmButton
                    message="Bu görsel silinecek. Emin misiniz?"
                    aria-label="Görseli sil"
                    className="grid min-h-9 min-w-9 place-items-center rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 size={14} aria-hidden />
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">Bu ürünün görseli yok; sitede kategori ikonlu yer tutucu görünür.</p>
      )}

      {configured ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple aria-label="Görsel seç" className="field min-w-0 flex-1 text-sm sm:max-w-sm" />
          <button type="button" onClick={upload} disabled={pending} className="btn btn-dark py-2.5">
            <ImagePlus size={16} aria-hidden /> {pending ? "Yükleniyor..." : "Yükle"}
          </button>
          <p className="basis-full text-xs text-neutral-500">JPG, PNG, WebP veya AVIF; en fazla {MAX_FILES} görsel. Büyük görseller yüklemeden önce otomatik küçültülür. İlk görsel kapaktır.</p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-brand-500 bg-brand-50 p-3 text-sm font-semibold">
          Görsel yükleme kapalı: Cloudflare R2 bağlantı bilgileri (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) henüz girilmemiş.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

