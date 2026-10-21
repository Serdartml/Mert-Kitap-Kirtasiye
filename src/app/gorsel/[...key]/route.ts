import { getObject, r2Config } from "@/lib/r2";

// Ürün görsellerini R2'den okuyup sitenin kendi adresinden sunar (/gorsel/urunler/<ürün>/<dosya>). Bazı ağlarda
// r2.dev adresleri açılmadığı için görseller doğrudan R2 adresiyle verilmez. Dosya adları her yüklemede benzersizdir
// ve içerik değişmez: tarayıcı ve CDN bir yıl saklayabilir.

// Yalnızca ürün görsellerinin anahtar biçimi: urunler/<kimlik>/<uuid>.<uzantı>. Başka nesnelere erişilemez.
const KEY_PATTERN = /^urunler\/[A-Za-z0-9]+\/[A-Za-z0-9-]+\.(jpg|png|webp|avif)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const config = r2Config();
  if (!config || !KEY_PATTERN.test(key)) return new Response("Bulunamadı", { status: 404 });

  try {
    const object = await getObject(config, key);
    if (!object.Body) return new Response("Bulunamadı", { status: 404 });
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        ...(object.ContentLength != null ? { "Content-Length": String(object.ContentLength) } : {}),
        // s-maxage: Vercel'in CDN'i de saklar; aynı görsel için sunucu işlevi yalnızca ilk istekte çalışır.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") return new Response("Bulunamadı", { status: 404 });
    throw error;
  }
}
