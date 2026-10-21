import { describe, expect, it } from "vitest";
import { applyDiscount, parsePercent, percentOf } from "@/lib/discount";
import { isLowStock, LOW_STOCK } from "@/lib/low-stock";

describe("applyDiscount", () => {
  it("yüzdeyi asıl fiyattan uygular ve eski fiyatı yazar", () => {
    expect(applyDiscount(10000, null, 20)).toEqual({ priceKurus: 8000, compareAtKurus: 10000 });
  });

  it("zaten indirimli üründe asıl fiyat eski fiyattır; yüzde değiştikçe fiyat tekrar düşmez", () => {
    expect(applyDiscount(8000, 10000, 20)).toEqual({ priceKurus: 8000, compareAtKurus: 10000 });
    expect(applyDiscount(8000, 10000, 50)).toEqual({ priceKurus: 5000, compareAtKurus: 10000 });
  });

  it("fiyatı hiç düşürmeyen ya da 1 kuruşun altına indiren yüzdeyi atlar", () => {
    expect(applyDiscount(1, null, 20)).toBeNull();
    expect(applyDiscount(1000, null, 0.01)).toBeNull();
  });
});

describe("percentOf", () => {
  it("eski ve satış fiyatından yüzdeyi hesaplar (virgüllü, en çok iki ondalık)", () => {
    expect(percentOf(8000, 10000)).toBe("20");
    expect(percentOf(6667, 10000)).toBe("33,33");
    expect(percentOf(9990, 10000)).toBe("0,1");
  });

  it("indirim yoksa ya da alan geçersizse boş döner", () => {
    expect(percentOf(10000, 10000)).toBe("");
    expect(percentOf(10000, 8000)).toBe("");
    expect(percentOf(null, 10000)).toBe("");
    expect(percentOf(8000, null)).toBe("");
  });
});

describe("parsePercent", () => {
  it("yüzdeyi okur (virgül, % işareti); 0, 90 üstü ve geçersizi reddeder", () => {
    expect(parsePercent("20")).toBe(20);
    expect(parsePercent("12,5")).toBe(12.5);
    expect(parsePercent(" %30 ")).toBe(30);
    for (const bad of ["", "0", "91", "100", "abc", "-5"]) expect(parsePercent(bad), bad).toBeNull();
  });
});

describe("stok azalıyor", () => {
  it("eşik 2 adet; kitap kategorilerinde uyarı yok", () => {
    expect(LOW_STOCK).toBe(2);
    expect(isLowStock(2, "kirtasiye")).toBe(true);
    expect(isLowStock(3, "kirtasiye")).toBe(false);
    expect(isLowStock(0, "kirtasiye")).toBe(false);
    expect(isLowStock(1, "kultur-kitaplari")).toBe(false);
    expect(isLowStock(1, "hazirlik-kitaplari")).toBe(false);
  });
});
