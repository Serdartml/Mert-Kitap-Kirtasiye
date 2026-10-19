import "server-only";
import { db } from "./db";

export interface CleanupResult {
  rateLimits: number;
  sessions: number;
  passwordResets: number;
  emailVerifications: number;
}

// Süresi dolmuş geçici kayıtları siler: deneme sınırı sayaçları, oturumlar, parola sıfırlama ve e-posta doğrulama
// bağlantıları. Hiçbiri artık kullanılamayacağı için silinmeleri hiçbir işlevi etkilemez (süresi dolmuş oturum zaten
// giriş saymaz). Günlük çalışır (vercel.json crons -> /api/cron/temizlik); sayaç tablosu ayrıca rastgele aralıklarla da temizlenir.
export async function cleanupExpired(now = new Date()): Promise<CleanupResult> {
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
  };
}
