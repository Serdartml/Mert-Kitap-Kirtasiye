import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const SESSION_COOKIE = "session";
export const ADMIN_LOGIN_PATH = "/yonetim/giris";
const SESSION_DAYS = 7;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Çerezde rastgele token, veritabanında yalnızca onun özeti durur:
// veritabanı sızsa bile oturum çerezi üretilemez.
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return session.user;
}

// Yalnızca server action içinden çağrılabilir (çerez yazar).
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  // Süresi dolmuş eski oturumları temizle.
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    store.delete(SESSION_COOKIE);
  }
}

// Yönetim sayfalarının ve yönetim action'larının HER BİRİ bunu çağırmalıdır. Layout'taki kontrol tek başına
// yetmez: sayfalar layout'u beklemeden çalışır, action'lar ise doğrudan POST ile çağrılabilir.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(ADMIN_LOGIN_PATH);
  return user;
}
