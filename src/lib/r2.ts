import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Ürün görselleri Cloudflare R2'de durur (S3 uyumlu). Ayarlar ortam değişkenlerinden gelir (.env.example'a bakın);
// biri eksikse yükleme kapalıdır ve yönetim ürün sayfası bunu söyler.
//
// Görsel adresi: R2_PUBLIC_URL (kendi alan adınız, örn. https://gorsel.siteniz.com) tanımlıysa görseller oradan gelir.
// Tanımsızsa ya da bir *.r2.dev adresiyse görseller sitenin kendi /gorsel/... adresinden sunulur (app/gorsel route'u):
// r2.dev adresleri bazı ağlarda (Türkiye'deki servis sağlayıcılar dahil) açılmıyor, site adresi her yerde açılır.

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  // Özel alan adı (sonunda eğik çizgi olmadan); yoksa görseller /gorsel/ üzerinden sunulur.
  publicUrl: string | null;
}

// Sitenin kendi adresi üzerinden görsel sunan yol öneki.
export const IMAGE_PROXY_PREFIX = "/gorsel/";

export function r2Config(): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  let publicUrl: string | null = R2_PUBLIC_URL?.replace(/\/+$/, "") || null;
  try {
    if (publicUrl && new URL(publicUrl).hostname.endsWith(".r2.dev")) publicUrl = null;
  } catch {
    publicUrl = null;
  }
  return { accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET, publicUrl };
}

function client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

export const urlForKey = (config: R2Config, key: string) => (config.publicUrl ? `${config.publicUrl}/${key}` : `${IMAGE_PROXY_PREFIX}${key}`);

// Yüklenen dosyanın adresini döndürür (veritabanına yazılan değer).
export async function uploadObject(config: R2Config, key: string, body: Uint8Array, contentType: string): Promise<string> {
  await client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Dosya adı her yüklemede yeni olduğundan içerik değişmez; tarayıcı ve CDN uzun süre saklayabilir.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return urlForKey(config, key);
}

// Adresi bizim depomuza ait olan görselin nesne anahtarı; başka bir adresteyse (dışarıdan eklenmiş) null.
export function keyFromUrl(config: R2Config, url: string): string | null {
  if (url.startsWith(IMAGE_PROXY_PREFIX)) return url.slice(IMAGE_PROXY_PREFIX.length);
  if (config.publicUrl && url.startsWith(`${config.publicUrl}/`)) return url.slice(config.publicUrl.length + 1);
  return null;
}

export async function deleteObject(config: R2Config, key: string): Promise<void> {
  await client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function getObject(config: R2Config, key: string) {
  return client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
}
