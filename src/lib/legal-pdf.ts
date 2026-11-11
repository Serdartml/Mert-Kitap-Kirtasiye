import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatPrice } from "./format";
import { getLegalDocument } from "./legal-content";
import type { MailAttachment } from "./mail";
import type { MailOrder } from "./mail-templates";
import { formatOrderDate } from "./order-status";
import { infoPageTitle, site } from "./site";

// Sipariş onayı e-postasına eklenen PDF: Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi, alıcı ve sipariş
// bilgileriyle birlikte (kalıcı veri saklayıcısı; hukuki inceleme kararı, 2026-11). Metinler e-postanın gövdesinde de
// yer alır; PDF üretilemezse e-posta eksiz gönderilir (actions/order.ts).

// Türkçe karakterler için gömülü font (Noto Sans, SIL Open Font License). Standalone çıktıya next.config.ts ekler.
const FONT_DIR = path.join(process.cwd(), "src", "fonts");
const REGULAR = path.join(FONT_DIR, "NotoSans-Regular.ttf");
const BOLD = path.join(FONT_DIR, "NotoSans-Bold.ttf");

const LEGAL_SLUGS = ["on-bilgilendirme-formu", "mesafeli-satis-sozlesmesi"] as const;

export function orderLegalPdf(order: MailOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 55, right: 55 },
      info: { Title: `${order.orderNo} - Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi`, Author: site.name },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("normal", REGULAR);
    doc.registerFont("kalin", BOLD);

    doc.font("kalin").fontSize(15).text(site.name);
    doc.font("normal").fontSize(9).fillColor("#57534e").text(`${site.address.full} · ${site.phone} · ${site.email}`);
    doc.moveDown();
    doc.fillColor("#000000").font("kalin").fontSize(11).text("Sipariş bilgileri");
    doc.font("normal").fontSize(9.5);
    doc.text(`Alıcı: ${order.fullName} · ${order.phone} · ${order.email}`);
    doc.text(`Sipariş: ${order.orderNo} · ${formatOrderDate(order.createdAt)}`);
    for (const item of order.items) {
      doc.text(`- ${item.name} × ${item.quantity}: ${formatPrice(item.unitPriceKurus * item.quantity)}`, { indent: 8 });
    }
    doc.font("kalin").text(`Toplam: ${formatPrice(order.totalKurus)} (KDV dahil)`);

    LEGAL_SLUGS.forEach((slug, index) => {
      const legal = getLegalDocument(slug)!;
      if (index > 0) doc.addPage();
      else doc.moveDown(1.5);
      doc.font("kalin").fontSize(13).text(infoPageTitle(slug).toLocaleUpperCase("tr-TR"));
      doc.moveDown(0.5);
      doc.font("normal").fontSize(9.5);
      if (legal.intro) doc.text(legal.intro, { paragraphGap: 4, align: "justify" });
      for (const section of legal.sections) {
        doc.moveDown(0.4);
        doc.font("kalin").fontSize(10).text(section.heading, { paragraphGap: 2 });
        doc.font("normal").fontSize(9.5);
        for (const paragraph of section.paragraphs) doc.text(paragraph, { paragraphGap: 3, align: "justify" });
      }
    });

    doc.end();
  });
}

export async function orderLegalAttachment(order: MailOrder): Promise<MailAttachment> {
  const pdf = await orderLegalPdf(order);
  return { filename: `${order.orderNo}-sozlesme.pdf`, content: pdf.toString("base64") };
}
