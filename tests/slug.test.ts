import { describe, expect, it } from "vitest";
import { kurusToInput, parsePriceToKurus, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("Türkçe karakterleri çevirir ve tire ile birleştirir", () => {
    expect(slugify("Çizim Seti 12'li")).toBe("cizim-seti-12li");
    expect(slugify("ŞĞÜİÖÇ ışğüöç")).toBe("sguioc-isguoc");
  });

  it("baştaki ve sondaki ayırıcıları atar, 80 karakterle sınırlar", () => {
    expect(slugify("  --Kalem--  ")).toBe("kalem");
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });
});

describe("parsePriceToKurus", () => {
  it("farklı yazımları kuruşa çevirir", () => {
    expect(parsePriceToKurus("449,90")).toBe(44990);
    expect(parsePriceToKurus("449.90")).toBe(44990);
    expect(parsePriceToKurus("1.249,90")).toBe(124990);
    expect(parsePriceToKurus("449")).toBe(44900);
    expect(parsePriceToKurus("₺ 15 TL")).toBe(1500);
  });

  it("geçersiz girdide null döner", () => {
    expect(parsePriceToKurus("")).toBeNull();
    expect(parsePriceToKurus("abc")).toBeNull();
    expect(parsePriceToKurus("-5")).toBeNull();
    expect(parsePriceToKurus("1,234")).toBeNull();
  });

  it("kurusToInput ile tutarlıdır", () => {
    expect(kurusToInput(44990)).toBe("449,90");
    expect(parsePriceToKurus(kurusToInput(124990))).toBe(124990);
    expect(kurusToInput(null)).toBe("");
  });
});
