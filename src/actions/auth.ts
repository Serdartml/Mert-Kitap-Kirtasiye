"use server";

import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH, createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { checkLimits, clearLimit, clientIp, LIMITS } from "@/lib/rate-limit";

export interface LoginState {
  error: string;
}

export async function adminLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "E-posta ve parolanızı yazın." };

  // Müşteri girişinden ayrı sayaç; sınır parola özeti hesaplanmadan önce uygulanır.
  const emailKey = `admin-email:${email}`;
  const blocked = await checkLimits([
    { key: emailKey, limit: LIMITS.loginEmail },
    { key: `admin-ip:${await clientIp()}`, limit: LIMITS.loginIp },
  ]);
  if (blocked) return { error: blocked };

  const user = await db.user.findUnique({ where: { email } });
  // Kullanıcı yoksa da özet hesaplanır; hata mesajı her durumda aynıdır.
  const passwordOk = await verifyPassword(password.slice(0, 200), user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk || user.role !== "ADMIN") {
    return { error: "E-posta veya parola hatalı." };
  }

  await clearLimit(emailKey);
  await createSession(user.id);
  redirect("/yonetim");
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect(ADMIN_LOGIN_PATH);
}
