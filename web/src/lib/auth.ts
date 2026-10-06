import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./db";

export const SESSION_COOKIE = "session";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Giriş/kayıt arayüzü henüz yok; çerez hiç yazılmadığı için şimdilik hep null döner.
// Giriş eklendiğinde: rastgele token üret, hash'ini Session tablosuna yaz, token'ı bu çereze koy.
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
