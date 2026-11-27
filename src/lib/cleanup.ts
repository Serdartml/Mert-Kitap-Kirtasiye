import "server-only";
import { db } from "./db";
import { cancelExpiredAwaitingOrders } from "./paytr";

export interface CleanupResult {
  rateLimits: number;
  sessions: number;
  passwordResets: number;
  emailVerifications: number;
  awaitingPaymentOrders: number;
}

// Süresi dolmuş geçici kayıtları siler: deneme sınırı sayaçları, oturumlar, parola sıfırlama ve e-posta doğrulama
// bağlantıları. Hiçbiri artık kullanılamayacağı için silinmeleri hiçbir işlevi etkilemez (süresi dolmuş oturum zaten
// giriş saymaz). Günlük çalışır (sunucu cron'u -> /api/cron/temizlik); sayaç tablosu ayrıca rastgele aralıklarla da temizlenir.
export async function cleanupExpired(now = new Date()): Promise<CleanupResult> {
  // Ödemesi tamamlanmamış, süresi dolmuş kartla ödeme siparişleri iptal edilir ve stokları geri döner (lib/paytr.ts).
  // Sipariş verilirken de yapılır; bu, sipariş gelmeyen günlerde ayrılmış stoğun takılı kalmamasını sağlar.
  const awaitingPaymentOrders = await cancelExpiredAwaitingOrders(now);
  const [rateLimits, sessions, passwordResets, emailVerifications] = await Promise.all([
    db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    // Kullanılmış bağlantılar süresine bakılmadan da gider.
    db.passwordReset.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
    db.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return {
    rateLimits: rateLimits.count,
    sessions: sessions.count,
    passwordResets: passwordResets.count,
    emailVerifications: emailVerifications.count,
    awaitingPaymentOrders,
  };
}
