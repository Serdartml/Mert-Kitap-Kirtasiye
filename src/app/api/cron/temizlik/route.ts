import { createHash, timingSafeEqual } from "node:crypto";
import { cleanupExpired } from "@/lib/cleanup";

// Sunucudaki cron günlük çağırır (deploy/sunucu-kurulum.sh, /usr/local/bin/mertkitap-temizlik):
// "Authorization: Bearer <CRON_SECRET>" başlığıyla, yalnızca sunucunun içinden (127.0.0.1:3000).
// Anahtar yoksa uç nokta kapalıdır: herkese açık adresten temizlik tetiklenemez.
const digest = (value: string) => createHash("sha256").update(value).digest();

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
    return new Response("Yetkisiz", { status: 401 });
  }

  const result = await cleanupExpired();
  return Response.json({ ok: true, ...result });
}
