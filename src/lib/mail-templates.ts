import "server-only";
import { formatPrice } from "./format";
import type { MailMessage } from "./mail";
import { formatOrderDate, orderStatusLabels, orderStatusNotes } from "./order-status";
import { site } from "./site";
import type { OrderStatus } from "@prisma/client";

// E-posta şablonları. HTML, e-posta istemcileri için satır içi stillidir; her iletinin düz metin karşılığı da vardır.
// Kullanıcıdan gelen her değer esc() ile kaçışlanır.

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#e9e61c;padding:16px 20px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold">${esc(site.name)}</div>
<div style="background:#ffffff;padding:24px 20px;border-radius:0 0 12px 12px;line-height:1.55;font-size:15px">
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${bodyHtml}
</div>
<p style="font-size:12px;color:#78716c;text-align:center;margin:16px 0 0">${esc(site.address.full)} · ${esc(site.phone)}</p>
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#1c1917;color:#e9e61c;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;
}

const absolute = (path: string) => `${site.url.replace(/\/$/, "")}${path}`;

export interface MailOrder {
  orderNo: string;
  fullName: string;
  email: string;
  phone: string;
  note: string | null;
  totalKurus: number;
  createdAt: Date;
  status: OrderStatus;
  items: { name: string; quantity: number; unitPriceKurus: number }[];
}

function itemsText(order: MailOrder): string {
  return order.items
    .map((item) => `- ${item.name} x ${item.quantity}: ${formatPrice(item.unitPriceKurus * item.quantity)}`)
    .join("\n");
}

function itemsHtml(order: MailOrder): string {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #e7e5e4">${esc(item.name)} × ${item.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #e7e5e4;text-align:right;white-space:nowrap">${esc(formatPrice(item.unitPriceKurus * item.quantity))}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:10px 0;font-weight:bold">Toplam</td><td style="padding:10px 0;font-weight:bold;text-align:right">${esc(formatPrice(order.totalKurus))}</td></tr></table>`;
}

// Müşteriye: sipariş alındı.
export function orderConfirmationMail(order: MailOrder): MailMessage {
  const link = absolute(`/siparis/${order.orderNo}`);
  return {
    to: order.email,
    subject: `Siparişiniz alındı - ${order.orderNo}`,
    text: `Merhaba ${order.fullName},\n\nSiparişiniz alındı. Sipariş numaranız: ${order.orderNo}\n\n${itemsText(order)}\n\nToplam: ${formatPrice(order.totalKurus)}\n\nSiparişiniz mağazamızdan teslim edilir, ödeme teslim sırasında mağazada yapılır. Hazır olduğunda size haber vereceğiz.\n\nSipariş durumu: ${link}\n\n${site.name}\n${site.address.full}\n${site.phone}`,
    html: layout(
      "Siparişiniz alındı",
      `<p>Merhaba ${esc(order.fullName)},</p><p>Sipariş numaranız: <strong>${esc(order.orderNo)}</strong></p>${itemsHtml(order)}<p>Siparişiniz mağazamızdan teslim edilir, ödeme teslim sırasında mağazada yapılır. Hazır olduğunda size haber vereceğiz.</p>${button(link, "Sipariş durumunu gör")}`,
    ),
  };
}

// Yönetici bildirimi: yeni sipariş.
export function newOrderAdminMail(to: string, order: MailOrder): MailMessage {
  const link = absolute(`/yonetim/siparisler`);
  return {
    to,
    subject: `Yeni sipariş ${order.orderNo} - ${formatPrice(order.totalKurus)}`,
    text: `Yeni sipariş: ${order.orderNo} (${formatOrderDate(order.createdAt)})\n\nMüşteri: ${order.fullName}\nTelefon: ${order.phone}\nE-posta: ${order.email}\n${order.note ? `Not: ${order.note}\n` : ""}\n${itemsText(order)}\n\nToplam: ${formatPrice(order.totalKurus)}\n\nYönetim: ${link}`,
    html: layout(
      `Yeni sipariş ${order.orderNo}`,
      `<p><strong>${esc(order.fullName)}</strong><br>${esc(order.phone)}<br>${esc(order.email)}</p>${order.note ? `<p>Not: ${esc(order.note)}</p>` : ""}${itemsHtml(order)}${button(link, "Siparişlere git")}`,
    ),
  };
}

// Müşteriye: sipariş durumu değişti (hazırlanıyor, teslime hazır, iptal...).
export function orderStatusMail(order: MailOrder, status: OrderStatus): MailMessage {
  const link = absolute(`/siparis/${order.orderNo}`);
  const label = orderStatusLabels[status];
  const note = orderStatusNotes[status];
  return {
    to: order.email,
    subject: `Siparişiniz: ${label} - ${order.orderNo}`,
    text: `Merhaba ${order.fullName},\n\n${order.orderNo} numaralı siparişinizin durumu: ${label}\n${note}\n\nSipariş durumu: ${link}\n\n${site.name}\n${site.address.full}\n${site.phone}`,
    html: layout(
      label,
      `<p>Merhaba ${esc(order.fullName)},</p><p><strong>${esc(order.orderNo)}</strong> numaralı siparişinizin durumu: <strong>${esc(label)}</strong></p><p>${esc(note)}</p>${button(link, "Sipariş durumunu gör")}`,
    ),
  };
}

// Yönetici bildirimi: iletişim formundan yeni mesaj.
export function newContactAdminMail(to: string, message: { name: string; email: string; message: string }): MailMessage {
  return {
    to,
    subject: `Yeni mesaj: ${message.name}`,
    text: `${message.name} <${message.email}> yazdı:\n\n${message.message}\n\nYanıtlamak için bu e-postayı yanıtlayabilirsiniz.`,
    html: layout(
      "Yeni mesaj",
      `<p><strong>${esc(message.name)}</strong> (${esc(message.email)}) yazdı:</p><p style="white-space:pre-wrap;background:#f5f5f4;padding:12px;border-radius:8px">${esc(message.message)}</p>`,
    ),
  };
}

// E-posta adresini doğrulama bağlantısı (kayıttan sonra ve "yeniden gönder" ile).
export function emailVerificationMail(to: string, name: string | null, token: string, validHours: number): MailMessage {
  const link = absolute(`/eposta-dogrula?token=${encodeURIComponent(token)}`);
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  return {
    to,
    subject: "E-posta adresinizi doğrulayın",
    text: `${greeting}\n\n${site.name} hesabınızın e-posta adresini doğrulamak için aşağıdaki bağlantıyı açın ve "Doğrula" düğmesine basın. Bağlantı ${validHours} saat geçerlidir.\n\n${link}\n\nBu hesabı siz açmadıysanız bu e-postayı yok sayabilirsiniz.`,
    html: layout(
      "E-posta adresinizi doğrulayın",
      `<p>${esc(greeting)}</p><p>Hesabınızın e-posta adresini doğrulamak için aşağıdaki düğmeyi açıp "Doğrula"ya basın. Bağlantı ${validHours} saat geçerlidir.</p>${button(link, "E-postamı doğrula")}<p style="font-size:13px;color:#78716c">Bu hesabı siz açmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
    ),
  };
}

// Parola sıfırlama bağlantısı.
export function passwordResetMail(to: string, name: string | null, token: string, validMinutes: number): MailMessage {
  const link = absolute(`/sifre-sifirla?token=${encodeURIComponent(token)}`);
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  return {
    to,
    subject: "Parola sıfırlama bağlantınız",
    text: `${greeting}\n\nParolanızı sıfırlamak için aşağıdaki bağlantıyı açın. Bağlantı ${validMinutes} dakika geçerlidir ve yalnızca bir kez kullanılabilir.\n\n${link}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; parolanız değişmez.`,
    html: layout(
      "Parolanızı sıfırlayın",
      `<p>${esc(greeting)}</p><p>Parolanızı sıfırlamak için aşağıdaki düğmeyi kullanın. Bağlantı ${validMinutes} dakika geçerlidir ve yalnızca bir kez kullanılabilir.</p>${button(link, "Parolamı sıfırla")}<p style="font-size:13px;color:#78716c">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; parolanız değişmez.</p>`,
    ),
  };
}
