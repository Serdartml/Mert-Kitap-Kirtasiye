import { describe, expect, it } from "vitest";
import { isProductFilter, parseProductSort, productListWhere, productOrderBy, sortParam } from "@/lib/admin-products";

describe("sıralama", () => {
  it("adres parametresini okur, geçersizi yok sayar", () => {
    expect(parseProductSort("fiyat-artan")).toEqual({ column: "fiyat", direction: "artan" });
    expect(parseProductSort("stok-azalan")).toEqual({ column: "stok", direction: "azalan" });
    for (const bad of [undefined, "", "fiyat", "fiyat-yukari", "sku-artan", "costKurus-artan"]) expect(parseProductSort(bad), String(bad)).toBeNull();
    expect(sortParam({ column: "durum", direction: "azalan" })).toBe("durum-azalan");
  });

  it("sıralama yoksa son güncellenen üstte; her zaman benzersiz ikinci anahtar var", () => {
    expect(productOrderBy(null)).toEqual([{ updatedAt: "desc" }, { id: "asc" }]);
    expect(productOrderBy({ column: "fiyat", direction: "azalan" })).toEqual([{ priceKurus: "desc" }, { name: "asc" }, { id: "asc" }]);
    expect(productOrderBy({ column: "ad", direction: "artan" })).toEqual([{ name: "asc" }, { id: "asc" }]);
    expect(productOrderBy({ column: "kategori", direction: "artan" })[0]).toEqual({ category: { name: "asc" } });
  });
});

const roots = [
  { id: "kirt", children: [{ id: "kalem" }, { id: "defter" }] },
  { id: "kitap", children: [] },
];

describe("productListWhere", () => {
  it("filtre yoksa koşul boştur (tüm ürünler)", () => {
    expect(productListWhere({ q: "", categoryId: "", filter: "" }, roots)).toEqual({});
  });

  it("ana kategori seçilince alt kategorilerini de kapsar", () => {
    expect(productListWhere({ q: "", categoryId: "kirt", filter: "" }, roots)).toEqual({ categoryId: { in: ["kirt", "kalem", "defter"] } });
    expect(productListWhere({ q: "", categoryId: "kalem", filter: "" }, roots)).toEqual({ categoryId: { in: ["kalem"] } });
  });

  it("durum filtresi ve aramayı birleştirir", () => {
    const where = productListWhere({ q: "silgi", categoryId: "", filter: "stoksuz" }, roots);
    expect(where).toMatchObject({ stock: 0 });
    expect(where.OR).toHaveLength(4); // ad, stok kodu, barkod, marka
  });

  it("bilinmeyen filtre anahtarını kabul etmez", () => {
    expect(isProductFilter("pasif")).toBe(true);
    expect(isProductFilter("rastgele")).toBe(false);
    expect(isProductFilter(undefined)).toBe(false);
  });
});
