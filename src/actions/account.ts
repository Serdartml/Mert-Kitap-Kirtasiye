"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, safeNextPath } from "@/lib/auth";
import { attachCartToUser, releaseCartCookie } from "@/lib/cart";
import { db } from "@/lib/db";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";

// Müşteri üyeliği: kayıt, giriş, çıkış. Yönetici girişi ayrı (actions/auth.ts); oturum altyapısı ortak.
// Eksikler (bilerek, ayrı işler): e-posta doğrulama ve parola sıfırlama e-posta gönderimi ister;
// deneme sınırlaması (rate limit) yok.

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

  const user = await db.user.findUnique({ where: { email } });
  // Kullanıcı yoksa da özet hesaplanır; hata mesajı her durumda aynıdır.
  const passwordOk = await verifyPassword(password.slice(0, 200), user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) return { error: "E-posta veya parola hatalı." };

  return signIn(user.id, formData.get("sonra"));
}

export async function logout(): Promise<void> {
  await destroySession();
  await releaseCartCookie();
  revalidatePath("/", "layout");
  redirect("/");
}
