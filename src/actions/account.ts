"use server";

import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { io, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createSession, destroySession, hashSessionToken, safeNextPath } from "@/lib/auth";
import { attachCartToUser, releaseCartCookie } from "@/lib/cart";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { passwordResetMail } from "@/lib/mail-templates";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { checkLimits, clearLimit, clientIp, LIMITS } from "@/lib/rate-limit";

// Müşteri üyeliği: kayıt, giriş, çıkış. Yönetici girişi ayrı (actions/auth.ts); oturum altyapısı ortak.
// Parola sıfırlama e-posta ile yapılır (aşağıda). E-posta doğrulama henüz yok (ayrı iş).

export interface FormState {
  error: string;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const registerSchema = z.object({
  name: z.string().min(2, "Adınızı ve soyadınızı yazın.").max(100),
  email: z.email("Geçerli bir e-posta adresi yazın.").max(200),
  // Üst sınır: scrypt'e çok uzun girdi verip sunucuyu yormayı önler.
  password: z.string().min(8, "Parolanız en az 8 karakter olmalı.").max(200, "Parolanız çok uzun."),
});

// Giriş ve kayıttan sonra ortak adımlar: oturum aç, misafir sepetini üyeye bağla, dön.
async function signIn(userId: string, next: unknown): Promise<never> {
  await createSession(userId);
  await attachCartToUser(userId);
  // Üst menüdeki hesap bağlantısı ve sepet rozeti yenilensin.
  revalidatePath("/", "layout");
  redirect(safeNextPath(next));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email").toLowerCase(),
    // Parola kırpılmaz: baştaki ve sondaki boşluk da parolanın parçasıdır.
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const blocked = await checkLimits([{ key: `register-ip:${await clientIp()}`, limit: LIMITS.registerIp }]);
  if (blocked) return { error: blocked };

  const { name, email, password } = parsed.data;
  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Bu e-posta adresiyle kayıtlı bir hesap var. Giriş yapmayı deneyin." };
    }
    throw error;
  }

  return signIn(userId, formData.get("sonra"));
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "E-posta ve parolanızı yazın." };

  // Sınır, pahalı parola özeti hesaplanmadan önce uygulanır.
  const emailKey = `login-email:${email}`;
  const blocked = await checkLimits([
    { key: emailKey, limit: LIMITS.loginEmail },
    { key: `login-ip:${await clientIp()}`, limit: LIMITS.loginIp },
  ]);
  if (blocked) return { error: blocked };

  const user = await db.user.findUnique({ where: { email } });
  // Kullanıcı yoksa da özet hesaplanır; hata mesajı her durumda aynıdır.
  const passwordOk = await verifyPassword(password.slice(0, 200), user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) return { error: "E-posta veya parola hatalı." };

  await clearLimit(emailKey);
  return signIn(user.id, formData.get("sonra"));
}

// ---------- Parola sıfırlama ----------

const RESET_VALID_MINUTES = 60;

export interface ResetRequestState {
  error: string;
  // Başarıda (ve hesap olmasa da) aynı mesaj: hangi e-postaların kayıtlı olduğu sızmasın.
  message?: string;
}

export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = text(formData, "email").toLowerCase();
  if (!z.email().max(200).safeParse(email).success) return { error: "Geçerli bir e-posta adresi yazın." };

  const blocked = await checkLimits([
    { key: `reset-request-email:${email}`, limit: LIMITS.resetRequestEmail },
    { key: `reset-request-ip:${await clientIp()}`, limit: LIMITS.resetRequestIp },
  ]);
  if (blocked) return { error: blocked };

  const user = await db.user.findUnique({ where: { email } });
  // Parolası olmayan (ör. ileride sosyal girişli) hesaplara bağlantı gitmez.
  if (user?.passwordHash) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordReset.deleteMany({ where: { userId: user.id } });
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + RESET_VALID_MINUTES * 60 * 1000),
      },
    });
    const mail = passwordResetMail(user.email, user.name, token, RESET_VALID_MINUTES);
    after(() => sendMail(mail));
  }
  return {
    error: "",
    message: "Bu e-posta adresiyle kayıtlı bir hesap varsa parola sıfırlama bağlantısı gönderildi. Gelen kutunuzu (ve gereksiz klasörünü) kontrol edin.",
  };
}

const resetSchema = z
  .object({
    token: z.string().min(10).max(200),
    next: z.string().min(8, "Yeni parolanız en az 8 karakter olmalı.").max(200, "Yeni parolanız çok uzun."),
    confirm: z.string().max(200),
  })
  .refine((value) => value.next === value.confirm, { message: "Parolalar aynı değil.", path: ["confirm"] });

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: text(formData, "token"),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const blocked = await checkLimits([{ key: `reset-use-ip:${await clientIp()}`, limit: LIMITS.resetUseIp }]);
  if (blocked) return { error: blocked };

  const invalid = { error: "Bu bağlantı geçersiz ya da süresi dolmuş. Yeni bir bağlantı isteyin." };
  const reset = await db.passwordReset.findUnique({
    where: { tokenHash: hashSessionToken(parsed.data.token) },
    include: { user: { select: { email: true } } },
  });
  await io();
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return invalid;

  // Bağlantı tek kullanımlık: koşullu işaretleme iki isteğin aynı bağlantıyla geçmesini engeller.
  const passwordHash = await hashPassword(parsed.data.next);
  const claimed = await db.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return invalid;

  await db.user.update({ where: { id: reset.userId }, data: { passwordHash } });
  // Parolayı bilmeyen biri oturum açmış olabilir: tüm cihazlardaki oturumlar kapanır. Kullanıcı yeniden girer.
  await db.session.deleteMany({ where: { userId: reset.userId } });
  await db.passwordReset.deleteMany({ where: { userId: reset.userId } });
  // Çok denemeyle kilitlenmiş bir müşteri yeni parolasıyla hemen girebilsin.
  await clearLimit(`login-email:${reset.user.email}`);

  redirect("/giris?sifre=yenilendi");
}

export async function logout(): Promise<void> {
  await destroySession();
  await releaseCartCookie();
  revalidatePath("/", "layout");
  redirect("/");
}
