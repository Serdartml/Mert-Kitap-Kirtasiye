import { describe, expect, it } from "vitest";
import { getLegalDocument, legalDocumentText, legalReviewed, missingOwnerInfo } from "@/lib/legal-content";
import { infoPages } from "@/lib/site";

describe("yasal metinler", () => {
  it("menüdeki her bilgi sayfasının içeriği vardır", () => {
    for (const page of infoPages) {
      const doc = getLegalDocument(page.slug);
      expect(doc, page.slug).not.toBeNull();
      expect(doc!.sections.length).toBeGreaterThan(0);
    }
  });

  it("bölüm başlıkları ve paragraflar tekrar etmez (React anahtarları çakışmasın)", () => {
    for (const page of infoPages) {
      const doc = getLegalDocument(page.slug)!;
      const headings = doc.sections.map((s) => s.heading);
      expect(new Set(headings).size, page.slug).toBe(headings.length);
      for (const section of doc.sections) {
        expect(new Set(section.paragraphs).size, `${page.slug}: ${section.heading}`).toBe(section.paragraphs.length);
      }
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
