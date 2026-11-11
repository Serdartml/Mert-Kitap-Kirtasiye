import { describe, expect, it } from "vitest";
import {
  type CommerceMode,
  getLegalDocument,
  legalDocumentText,
  legalReviewed,
  liveCommerce,
  missingOwnerInfo,
  plannedCommerce,
} from "@/lib/legal-content";
import { infoPages } from "@/lib/site";

const modes: [string, CommerceMode][] = [
  ["şu anki", liveCommerce],
  ["hedef", plannedCommerce],
  ["yalnızca online ödeme", { onlinePayment: true, shipping: false }],
];

describe("yasal metinler", () => {
  it("menüdeki her bilgi sayfasının içeriği vardır", () => {
    for (const page of infoPages) {
      const doc = getLegalDocument(page.slug);
      expect(doc, page.slug).not.toBeNull();
      expect(doc!.sections.length).toBeGreaterThan(0);
    }
  });

  it("bölüm başlıkları ve paragraflar tekrar etmez (React anahtarları çakışmasın)", () => {
    for (const [name, mode] of modes) {
      for (const page of infoPages) {
        const doc = getLegalDocument(page.slug, mode)!;
        const headings = doc.sections.map((s) => s.heading);
        expect(new Set(headings).size, `${name}: ${page.slug}`).toBe(headings.length);
        for (const section of doc.sections) {
          expect(new Set(section.paragraphs).size, `${name}: ${page.slug}: ${section.heading}`).toBe(section.paragraphs.length);
        }
      }
    }
  });

  it("varsayılan metin sitenin şu anki modelidir; kargo ve online ödeme yalnızca açıkken anlatılır", () => {
    const live = JSON.stringify(getLegalDocument("on-bilgilendirme-formu"));
    expect(live).toBe(JSON.stringify(getLegalDocument("on-bilgilendirme-formu", liveCommerce)));
    if (!liveCommerce.onlinePayment) expect(live).not.toContain("PayTR");
    if (!liveCommerce.shipping) expect(live).toContain("kargo) yapılmamaktadır");

    const planned = JSON.stringify(getLegalDocument("on-bilgilendirme-formu", plannedCommerce));
    expect(planned).toContain("PayTR");
    expect(planned).toContain("kendi kuryesiyle");
    expect(planned).toContain("Bornova");
    expect(planned).not.toContain("[DOLDURULACAK");
    expect(planned).not.toContain("yapılmamaktadır");
    expect(JSON.stringify(getLegalDocument("kvkk", plannedCommerce))).toContain("PayTR Ödeme ve Elektronik Para Kuruluşu");
  });

  it("cayma hakkı satıcının onayına bağlanmaz ve iade bedeli her modelde yazılıdır", () => {
    for (const [name, mode] of modes) {
      for (const slug of ["on-bilgilendirme-formu", "mesafeli-satis-sozlesmesi"]) {
        const cayma = getLegalDocument(slug, mode)!.sections.find((s) => s.heading.includes("Cayma hakkı") && !s.heading.includes("kullanılamayan"))!;
        const text = cayma.paragraphs.join(" ");
        expect(text, `${name}: ${slug}`).toMatch(/on dört (\(14\) )?gün içinde/);
        expect(text, `${name}: ${slug}`).toMatch(/iade (eder|edilir)/);
        expect(text, `${name}: ${slug}`).not.toMatch(/uygunsa|satıcının onay/);
      }
    }
  });

  it("iade şartı (ambalaj açılmamış, ürün hasarsız) her modelde yazılıdır; ayıplı üründe aranmaz", () => {
    for (const [name, mode] of modes) {
      for (const slug of ["on-bilgilendirme-formu", "mesafeli-satis-sozlesmesi", "iade-ve-degisim"]) {
        const text = JSON.stringify(getLegalDocument(slug, mode));
        expect(text, `${name}: ${slug}`).toContain("ambalajı açılmamış");
        expect(text, `${name}: ${slug}`).toMatch(/yırtı/);
      }
    }
  });

  it("iade yalnızca mağazaya getirerek veya müşterinin kendi ödediği kargoyla yapılır; kurye iade almaz", () => {
    for (const [name, mode] of modes) {
      for (const slug of ["on-bilgilendirme-formu", "mesafeli-satis-sozlesmesi", "iade-ve-degisim"]) {
        const text = JSON.stringify(getLegalDocument(slug, mode));
        expect(text, `${name}: ${slug}`).toMatch(/kargo/i);
        expect(text, `${name}: ${slug}`).toContain("karşı ödemeli");
        expect(text, `${name}: ${slug}`).not.toMatch(/kurye(miz)?(e)? (tarafından )?(ücretsiz )?(teslim alır|teslim eder|teslim etmeniz)/);
      }
    }
    expect(JSON.stringify(getLegalDocument("on-bilgilendirme-formu", plannedCommerce))).toContain("mağazanın kapanış saatine kadar");
  });

  it("adrese teslimde teslimat kodu var, ikinci teslimat denemesi yok", () => {
    const planned = JSON.stringify(getLegalDocument("mesafeli-satis-sozlesmesi", plannedCommerce));
    expect(planned).toContain("teslimat kodu");
    expect(planned).toContain("ikinci bir teslimat denemesi yapılmaz");
    expect(planned).not.toContain("yeni bir teslimat zamanı");
    expect(planned).toContain("100 TL");
  });

  it("mesafeli satış sözleşmesinde mücbir sebep ve bildirim maddeleri vardır", () => {
    for (const [name, mode] of modes) {
      const headings = getLegalDocument("mesafeli-satis-sozlesmesi", mode)!.sections.map((s) => s.heading);
      expect(headings, name).toContain("9. Mücbir sebep");
      expect(headings, name).toContain("10. Bildirimler");
      headings.forEach((h, i) => expect(h, name).toMatch(new RegExp(`^${i + 1}\\. `)));
    }
  });

  it("bilinmeyen sayfa için null döner", () => {
    expect(getLegalDocument("yok")).toBeNull();
  });

  // Hukuki onay verildi diye işaretlenip ticari bilgiler unutulursa yayına "[DOLDURULACAK]" yazılı metin çıkmasın.
  it("onaylı (legalReviewed) metinlerde eksik ticari bilgi kalmaz", () => {
    if (!legalReviewed) return;
    expect(missingOwnerInfo()).toEqual([]);
    for (const page of infoPages) {
      expect(JSON.stringify(getLegalDocument(page.slug)), page.slug).not.toContain("[DOLDURULACAK");
    }
  });

  it("taslakta eksik ticari bilgiler metinde işaretlenir", () => {
    if (missingOwnerInfo().length === 0) return;
    expect(JSON.stringify(getLegalDocument("mesafeli-satis-sozlesmesi"))).toContain("[DOLDURULACAK");
  });

  it("düz metin çıktısı başlık ve bölümleri içerir", () => {
    const text = legalDocumentText("Mesafeli Satış Sözleşmesi", getLegalDocument("mesafeli-satis-sozlesmesi")!);
    expect(text).toContain("MESAFELİ SATIŞ SÖZLEŞMESİ");
    expect(text).toContain("6. Cayma hakkı");
  });
});
