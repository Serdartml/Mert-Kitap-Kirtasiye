import "server-only";
import { orderLegalAttachment } from "./legal-pdf";
import { adminNotifyAddress, sendMail } from "./mail";
import { newOrderAdminMail, orderConfirmationMail, type MailOrder } from "./mail-templates";

// Sipariş kesinleşince (mağazada ödemede sipariş anında, kartla ödemede ödeme onayında) müşteriye onay, mağazaya bildirim.
// Onay e-postasına sözleşme metinleri PDF olarak da eklenir; PDF üretilemezse e-posta eksiz gider (metin gövdede de var).
// Çağıran after() içinde çalıştırır: gönderim yanıtı geciktirmez ve hatası siparişi etkilemez.
export async function sendOrderPlacedMails(order: MailOrder, adminWarning?: string): Promise<void> {
  const attachment = await orderLegalAttachment(order).catch((error) => {
    console.error("[sözleşme PDF] Üretilemedi:", error);
    return null;
  });
  await Promise.all([
    sendMail({ ...orderConfirmationMail(order), ...(attachment ? { attachments: [attachment] } : {}) }),
    sendMail(newOrderAdminMail(adminNotifyAddress(), order, adminWarning)),
  ]);
}
