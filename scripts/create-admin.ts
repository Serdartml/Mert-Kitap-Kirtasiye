// Yönetici hesabı oluşturur veya var olan hesabın parolasını değiştirip yönetici yapar.
//
//   npm run admin:create -- ornek@eposta.com
//
// Parola komut satırına yazılmaz (kabuk geçmişinde kalmasın); ADMIN_PASSWORD ortam değişkeninden
// okunur, yoksa sorulur.
import { PrismaClient } from "@prisma/client";
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Kullanım: npm run admin:create -- ornek@eposta.com");
  }

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Parola (en az 10 karakter; yazarken ekranda görünür): ");
    rl.close();
  }
  if (password.length < 10) throw new Error("Parola en az 10 karakter olmalı.");

  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email },
    create: { email, passwordHash, role: "ADMIN" },
    update: { passwordHash, role: "ADMIN" },
  });
  // Parola değiştiyse eski oturumlar geçersiz olsun.
  await db.session.deleteMany({ where: { userId: user.id } });

  console.log(`Yönetici hazır: ${email}. Giriş adresi: /yonetim/giris`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
