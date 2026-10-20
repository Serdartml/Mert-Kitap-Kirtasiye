import { describe, expect, it } from "vitest";
import { brandBackQuery, brandListWhere, brandOrderBy } from "@/lib/admin-brands";

describe("brandListWhere", () => {
  it("süzgeç yoksa koşul boştur", () => {
    expect(brandListWhere({ q: "", filter: "" })).toEqual({});
  });

  it("toptancı / marka süzgeci ve ad aramasını birleştirir", () => {
    expect(brandListWhere({ q: "gıp", filter: "toptanci" })).toEqual({ name: { contains: "gıp", mode: "insensitive" }, isWholesaler: true });
    expect(brandListWhere({ q: "", filter: "marka" })).toEqual({ isWholesaler: false });
    expect(brandListWhere({ q: "", filter: "bilinmeyen" })).toEqual({});
  });
});

describe("brandOrderBy", () => {
  it("ürün sayısına göre azalan, eşitlikte ada göre; varsayılan ada göre", () => {
    expect(brandOrderBy("urun")).toEqual([{ products: { _count: "desc" } }, { name: "asc" }]);
    expect(brandOrderBy("ad")).toEqual([{ name: "asc" }]);
    expect(brandOrderBy("rastgele")).toEqual([{ name: "asc" }]);
  });
});

describe("brandBackQuery", () => {
  it("yalnızca bilinen anahtarları geri taşır", () => {
    expect(brandBackQuery("?q=gipta&filtre=toptanci&sirala=urun&sayfa=3&durum=x&evil=1").toString()).toBe("q=gipta&filtre=toptanci&sirala=urun&sayfa=3");
  });

  it("boş, aşırı uzun ya da bozuk girdide güvenli kalır", () => {
    expect(brandBackQuery("").toString()).toBe("");
    expect(brandBackQuery(`q=${"a".repeat(101)}`).toString()).toBe("");
    expect(brandBackQuery("//evil.example/%00?q=x").toString()).toBe("");
  });
});
