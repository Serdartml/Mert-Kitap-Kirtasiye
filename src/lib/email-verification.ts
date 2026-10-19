import "server-only";
import { randomBytes } from "node:crypto";
import { hashSessionToken } from "./auth";
import { db } from "./db";
import type { MailMessage } from "./mail";
import { emailVerificationMail } from "./mail-templates";

export const VERIFY_VALID_HOURS = 24;

// Kullanıcı için yeni bir doğrulama bağlantısı üretir (eskisi geçersiz olur) ve gönderilecek e-postayı döndürür.
// Gönderimi çağıran yapar (after ile): kayıt ya da "yeniden gönder" yanıtı e-posta servisini beklemesin.
export async function issueEmailVerification(user: { id: string; email: string; name: string | null }): Promise<MailMessage> {
  const token = randomBytes(32).toString("base64url");
  await db.emailVerification.deleteMany({ where: { userId: user.id } });
  await db.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + VERIFY_VALID_HOURS * 60 * 60 * 1000),
    },
  });
  return emailVerificationMail(user.email, user.name, token, VERIFY_VALID_HOURS);
}
