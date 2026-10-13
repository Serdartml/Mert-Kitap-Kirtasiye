import { describe, expect, it } from "vitest";
import { getLegalDocument } from "@/lib/legal-content";
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
});
