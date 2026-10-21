import { describe, expect, it } from "vitest";
import { filtersCookieValue, isProductFilter, parseProductSort, parseSavedFilters, productListWhere, productOrderBy, sortParam } from "@/lib/admin-products";

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

  it("indirimli, öne çıkan ve stok azalıyor süzgeçleri", () => {
    expect(productListWhere({ q: "", categoryId: "", filter: "indirimli" }, roots)).toEqual({ compareAtKurus: { not: null } });
    expect(productListWhere({ q: "", categoryId: "", filter: "onecikan" }, roots)).toEqual({ isFeatured: true });
    // Stok azalıyor: 1-2 adet ve kitap kategorileri hariç.
    expect(productListWhere({ q: "", categoryId: "", filter: "azalan" }, roots)).toMatchObject({ stock: { gt: 0, lte: 2 }, NOT: expect.anything() });
  });

  it("hatırlanan süzgeci ve kategoriyi güvenli okur", () => {
    expect(filtersCookieValue("azalan", "abc123")).toBe("azalan~abc123");
    expect(filtersCookieValue("", "")).toBe("");
    expect(parseSavedFilters("azalan~abc123")).toEqual({ filter: "azalan", categoryId: "abc123" });
    expect(parseSavedFilters("~abc123")).toEqual({ filter: "", categoryId: "abc123" });
    expect(parseSavedFilters("rastgele~<script>")).toEqual({ filter: "", categoryId: "" });
    expect(parseSavedFilters(undefined)).toEqual({ filter: "", categoryId: "" });
  });

  it("bilinmeyen filtre anahtarını kabul etmez", () => {
    expect(isProductFilter("pasif")).toBe(true);
    expect(isProductFilter("rastgele")).toBe(false);
    expect(isProductFilter(undefined)).toBe(false);
  });
});
