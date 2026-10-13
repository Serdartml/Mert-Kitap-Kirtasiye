import "server-only";
import { site } from "./site";

// E-posta gönderimi (Resend REST API; ek paket gerekmez). RESEND_API_KEY tanımsızsa e-posta gönderilmez,
// sunucu konsoluna yazılır: geliştirmede akış anahtarsız denenebilir.
// Gönderim hatası asla isteği düşürmez; sipariş / mesaj zaten kaydedilmiştir.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const FROM = process.env.MAIL_FROM || `${site.shortName} <onboarding@resend.dev>`;

// Yönetici bildirimlerinin gideceği adres (yeni sipariş, yeni mesaj).
export function adminNotifyAddress(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || site.email;
}

export async function sendMail(message: MailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[e-posta - gönderilmedi, RESEND_API_KEY yok] Kime: ${message.to}\nKonu: ${message.subject}\n${message.text}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      console.error(`[e-posta] Gönderilemedi (${response.status}): ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[e-posta] Gönderilemedi:", error);
    return false;
  }
}
