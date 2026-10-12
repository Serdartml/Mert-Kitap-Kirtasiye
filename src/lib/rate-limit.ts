import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

// Veritabanı tabanlı deneme sınırı: ek servis gerektirmez, Vercel'de her örnekte aynı sayaçları görür.
// Pencere ilk denemede başlar ve sürerken uzamaz; süre dolunca sayaç sıfırlanır.

export interface Limit {
  // Pencere içinde izin verilen en fazla deneme.
  max: number;
  windowSeconds: number;
}

// Sınırlar. Giriş: bir kişinin parolasını kaba kuvvetle bulmayı (e-posta) ve tek kaynaktan
// çok hesap denemeyi (IP) kısıtlar. Her deneme sayılır; başarılı girişte e-posta sayacı sıfırlanır.
export const LIMITS = {
  loginEmail: { max: 8, windowSeconds: 15 * 60 },
  loginIp: { max: 30, windowSeconds: 15 * 60 },
  registerIp: { max: 10, windowSeconds: 60 * 60 },
  contactIp: { max: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

// Sayacı atomik artırır (tek SQL), pencere dolmuşsa yeniden başlatır. İzin verildi mi ve kaç saniye
// beklenmesi gerektiğini döndürür.
async function consume(key: string, limit: Limit): Promise<{ ok: boolean; retryAfter: number }> {
  const rows = await db.$queryRaw<{ count: number; retryAfter: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${limit.windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now()
                       THEN now() + make_interval(secs => ${limit.windowSeconds})
                       ELSE "RateLimit"."resetAt" END
    RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("resetAt" - now())))::int AS "retryAfter"`;
  const row = rows[0];

  // Süresi dolmuş satırları ara sıra temizle (her istekte değil).
  if (Math.random() < 0.02) {
    await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
  }
  return { ok: row.count <= limit.max, retryAfter: Math.max(row.retryAfter, 1) };
}

const digest = (value: string) => createHash("sha256").update(value).digest("base64url");

// İstemci adresi. Vercel x-forwarded-for'u kendisi yazar; ilk değer istemcidir. Yerelde başlık yoktur.
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "bilinmiyor";
}

export function waitMessage(retryAfter: number): string {
  const minutes = Math.ceil(retryAfter / 60);
  return `Çok fazla deneme yaptınız. Lütfen ${minutes} dakika sonra tekrar deneyin.`;
}

// Bir ya da birden çok (ad, değer, sınır) kontrolünü sırayla uygular; ilk aşılanda mesajı döndürür, yoksa null.
// Aşılan denemeler de sayılır ama pencere uzamaz; saldırgan sınırı büyütemez.
// key: "login-email:ali@x.com" gibi; değer veritabanına özetlenerek yazılır.
export async function checkLimits(checks: { key: string; limit: Limit }[]): Promise<string | null> {
  let blocked: string | null = null;
  for (const { key, limit } of checks) {
    const result = await consume(digest(key), limit);
    if (!result.ok && !blocked) blocked = waitMessage(result.retryAfter);
  }
  return blocked;
}

// Başarılı girişte o e-postanın sayacını sıfırla; meşru kullanıcı geçmiş hatalarla cezalandırılmasın.
export async function clearLimit(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key: digest(key) } });
}
