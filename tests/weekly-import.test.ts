import { describe, expect, it } from "vitest";
import { deliveryCodeMatches, generateDeliveryCode } from "@/lib/delivery-code";
import { generateDescription } from "@/lib/product-description";
import { reconcilePrice, type ExistingProduct } from "@/lib/product-import";
import { agendaIsOutdated, type TurnaItem } from "@/lib/turna-catalog";
import { isTurnaExport, planWeeklyImport } from "@/lib/weekly-import";

const product = (over: Partial<ExistingProduct> = {}): ExistingProduct => ({
  id: "p1", sku: "ITM1", barcode: "8690000000001", slug: "urun", name: "Ürün", description: "Elle yazılmış", priceKurus: 8500, compareAtKurus: 10000,
  costKurus: 5000, sourcePriceKurus: null, stock: 5, isActive: true, categoryId: "c1", brandId: null, ...over,
});
const item = (over: Partial<TurnaItem> = {}): TurnaItem => ({ line: 1, barcode: "8690000000001", code: "ITM1", name: "Tükenmez Kalem Mavi-Serve", stock: 7, costKurus: 5000, priceKurus: 10000, vat: 20, label: "", ...over });
const categories = [{ id: "r", name: "Kırtasiye", parentId: null }, { id: "c1", name: "Kalemler", parentId: "r" }];
const plan = (items: TurnaItem[], existing: ExistingProduct[], excluded: { sku: string; barcode: string | null }[] = [], zeroMissing = false) =>
  planWeeklyImport({ items, existing, excluded, categories, brands: [], reserved: new Map(), zeroMissing });

describe("reconcilePrice", () => {
  it("dosya fiyatı değişmediyse indirimi korur", () => {
    expect(reconcilePrice({ priceKurus: 8500, compareAtKurus: 10000 }, 10000, 5000)).toEqual({ priceKurus: 8500, compareAtKurus: 10000 });
  });
  it("dosya fiyatı artınca indirim oranını taşır", () => {
    expect(reconcilePrice({ priceKurus: 8500, compareAtKurus: 10000, sourcePriceKurus: 10000 }, 12000, 5000)).toEqual({ priceKurus: 10200, compareAtKurus: 12000 });
  });
  it("indirimli fiyat alışın altına düşmez", () => {
    expect(reconcilePrice({ priceKurus: 5000, compareAtKurus: 10000 }, 9000, 6000)).toEqual({ priceKurus: 6000, compareAtKurus: 9000 });
  });
  it("alışa çekilince indirim kalmıyorsa kaldırır", () => {
    expect(reconcilePrice({ priceKurus: 8500, compareAtKurus: 10000 }, 7000, 7000)).toEqual({ priceKurus: 7000, compareAtKurus: null });
  });
  it("indirimsiz üründe elle verilen fiyatı dosya değişmedikçe korur", () => {
    expect(reconcilePrice({ priceKurus: 9500, compareAtKurus: null, sourcePriceKurus: 10000 }, 10000, null)).toEqual({ priceKurus: 9500, compareAtKurus: null });
  });
});

describe("planWeeklyImport", () => {
  it("sitedeki üründe yalnızca stok ve fiyatı değiştirir", () => {
    const { plan: result, stats } = plan([item({ name: "Başka Ad", stock: 7 })], [product()]);
    expect(result.creates).toHaveLength(0);
    expect(result.updates[0]).toMatchObject({ name: "Ürün", description: "Elle yazılmış", stock: 7, priceKurus: 8500, compareAtKurus: 10000, sourcePriceKurus: 10000 });
    expect(stats).toMatchObject({ stockChanged: 1, priceChanged: 0, discountKept: 1 });
  });
  it("silinmiş ürünü kod ya da barkodla tanır, yeniden eklemez", () => {
    expect(plan([item({ code: "ITM9" })], [], [{ sku: "ITM9", barcode: null }]).stats).toMatchObject({ excluded: 1, created: 0 });
    expect(plan([item({ code: "ITM8" })], [], [{ sku: "ITM7", barcode: "8690000000001" }]).stats).toMatchObject({ excluded: 1, created: 0 });
  });
  it("yeni ürünü açıklamasıyla ekler", () => {
    const { plan: result } = plan([item({ code: "ITM2", barcode: "8690000000002" })], []);
    expect(result.creates[0]).toMatchObject({ sku: "ITM2", sourcePriceKurus: 10000, stock: 7 });
    expect(result.creates[0].description).toContain("Renk: Mavi");
    expect(result.creates[0].description).not.toContain("Serve");
  });
  it("eski ajanda ve hizmet kalemini eklemez", () => {
    expect(plan([item({ code: "ITM3", barcode: "1", name: "Ajanda 2025 Cep-Keskin" })], []).stats.oldEdition).toBe(1);
    expect(plan([item({ code: "ITM4", barcode: "2", name: "Fotokopi" })], []).stats.notForSale).toBe(1);
  });
  it("dosyada olmayan ürüne yalnızca seçilirse dokunur", () => {
    expect(plan([], [product()]).plan.updates).toHaveLength(0);
    expect(plan([], [product()], [], true).plan.updates[0]).toMatchObject({ stock: 0, priceKurus: 8500 });
  });
  it("Turna dosyasını tanır", () => {
    expect(isTurnaExport([[null, null], ["869", "ITM25000", "Kalem"]])).toBe(true);
    expect(isTurnaExport([["Stok Kodu", "Ürün Adı"], ["A1", "Kalem"]])).toBe(false);
  });
});

describe("yardımcılar", () => {
  it("ajanda dönemini ayırır", () => {
    expect(agendaIsOutdated("Akademik Ajanda A5 24/25 Hisli")).toBe(true);
    expect(agendaIsOutdated("Ajanda 2024")).toBe(true);
    expect(agendaIsOutdated("Akademik Ajanda 2026-27 A5")).toBe(false);
    expect(agendaIsOutdated("Akademik Ajanda 2026-2028")).toBe(false);
    expect(agendaIsOutdated("Planlayıcı 17/24 Spiralli")).toBe(false);
    expect(agendaIsOutdated("Zamansız Ajanda")).toBe(false);
  });
  it("teslimat kodu altı hanelidir ve doğrulanır", () => {
    const code = generateDeliveryCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(deliveryCodeMatches("123456", "123 456")).toBe(true);
    expect(deliveryCodeMatches("123456", "123457")).toBe(false);
    expect(deliveryCodeMatches("123456", "abc")).toBe(false);
  });
  it("açıklama yalnızca adda yazan özellikleri listeler", () => {
    const text = generateDescription({ name: "Planlayıcı Defter 13x21 96yp.mavi", root: "Kırtasiye", sub: "Ajanda & Planlayıcı" });
    expect(text).toContain("Ölçü: 13 x 21");
    expect(text).toContain("Yaprak: 96");
    expect(text).toContain("Renk: Mavi");
    expect(generateDescription({ name: "Araba 4x4 Çek Bırak", root: "Oyuncak", sub: "Araçlar & Figürler" })).not.toContain("Ölçü");
  });
});
