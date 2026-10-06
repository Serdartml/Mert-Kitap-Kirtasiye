"use server";

import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH, createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";

export interface LoginState {
  error: string;
}

export async function adminLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "E-posta ve parolanızı yazın." };

  const user = await db.user.findUnique({ where: { email } });
  // Kullanıcı yoksa da özet hesaplanır; hata mesajı her durumda aynıdır.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk || user.role !== "ADMIN") {
    return { error: "E-posta veya parola hatalı." };
  }

  await createSession(user.id);
  redirect("/yonetim");
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect(ADMIN_LOGIN_PATH);
}
