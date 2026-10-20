import { describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import {
  detectMapping,
  missingFields,
  parseRows,
  planImport,
  type ExistingProduct,
  type ImportOptions,
  type Mapping,
} from "@/lib/product-import";

const HEADERS = ["Stok Kodu", "Barkod", "Ürün Adı", "Satış Fiyatı", "Eski Fiyat", "Stok", "Kategori", "Marka", "Açıklama", "Aktif"];

const options = (overrides: Partial<ImportOptions> = {}): ImportOptions => ({
  mode: "tam",
  vatPercent: null,
  createCategories: false,
  subtractReserved: false,
  ...overrides,
});

const categories = [
  { id: "c-kirt", name: "Kırtasiye", parentId: null },
  { id: "c-def", name: "Defterler", parentId: "c-kirt" },
  { id: "c-kal", name: "Kalemler", parentId: "c-kirt" },
];

const existing: ExistingProduct[] = [
  {
    id: "p1",
    sku: "K-100",
    barcode: "8690000000001",
    slug: "klasik-dolma-kalem",
    name: "Klasik Dolma Kalem",
    description: null,
    priceKurus: 44990,
    compareAtKurus: null,
    costKurus: null,
    stock: 10,
    isActive: true,
    categoryId: "c-kal",
    brandId: null,
  },
];

function run(data: unknown[][], opts = options(), extra: Partial<Parameters<typeof planImport>[0]> = {}) {
  const mapping = detectMapping(data[0] as string[]);
  const parsed = parseRows(data, mapping, opts);
  return planImport(
    { rows: parsed.rows, existing, categories, brands: [], reserved: new Map(), options: opts, ...extra },
    parsed.errors,
    parsed.warnings,
  );
}

describe("detectMapping", () => {
  it("başlıkları harf ve Türkçe karakter farkı gözetmeden eşler", () => {
    const mapping = detectMapping(["STOK KODU", "barkod", "Ürün Adı", "Satış  Fiyatı", "STOK", "Grup"]);
    expect(mapping).toMatchObject({ sku: 0, barcode: 1, name: 2, price: 3, stock: 4, category: 5 });
  });

  it("bir sütunu yalnızca bir alana verir", () => {
    const mapping = detectMapping(["Stok", "Fiyat"]);
    expect(Object.values(mapping).sort()).toEqual([0, 1]);
  });

  it("modlara göre eksik alanları bildirir", () => {
    const mapping: Mapping = { sku: 0 };
    expect(missingFields(mapping, "tam")).toEqual(["Ürün adı", "Satış fiyatı", "Stok adedi"]);
    expect(missingFields({ sku: 0, stock: 1 }, "stok")).toEqual([]);
    expect(missingFields({ stock: 1 }, "stok")).toHaveLength(1);
  });
});

describe("alış fiyatı", () => {
  const COST_HEADERS = ["Stok Kodu", "Ürün Adı", "Satış Fiyatı", "Alış Fiyatı", "Stok", "Kategori"];

  it("başlığı tanır ve yeni ürüne yazar", () => {
    expect(detectMapping(COST_HEADERS)).toMatchObject({ cost: 3 });
    const plan = run([COST_HEADERS, ["N-1", "Yeni Defter", 95, "62,5", 4, "Kırtasiye > Defterler"]]);
    expect(plan.errors).toEqual([]);
    expect(plan.creates[0]).toMatchObject({ priceKurus: 9500, costKurus: 6250 });
  });

  it("boş ya da sıfır alış fiyatı mevcut değeri silmez; farklıysa günceller", () => {
    const withCost: ExistingProduct[] = [{ ...existing[0], costKurus: 20000 }];
    const sameSku = (cost: unknown) => [COST_HEADERS, ["K-100", "Klasik Dolma Kalem", 449.9, cost, 10, "Kalemler"]];
    expect(run(sameSku(0), options(), { existing: withCost }).updates).toEqual([]);
    expect(run(sameSku(null), options(), { existing: withCost }).updates).toEqual([]);
    const changed = run(sameSku(250), options(), { existing: withCost }).updates[0];
    expect(changed).toMatchObject({ costKurus: 25000 });
    expect(changed.changes).toContain("alış fiyatı");
  });
});

describe("parseRows", () => {
  it("fiyat ve stok hücrelerini sayı ya da Türkçe yazımdan okur", () => {
    const { rows, errors } = parseRows(
      [HEADERS, ["A1", 8690000000002, "Defter", "1.249,90", 1500, "12", "Kırtasiye > Defterler", "", "", "evet"]],
      detectMapping(HEADERS),
      { mode: "tam", vatPercent: null },
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ sku: "A1", barcode: "8690000000002", priceKurus: 124990, compareAtKurus: 150000, stock: 12, isActive: true });
    expect(rows[0].categoryPath).toEqual(["Kırtasiye", "Defterler"]);
  });

  it("KDV hariç fiyatı KDV'li fiyata çevirir", () => {
    const { rows } = parseRows([HEADERS, ["A1", "", "Defter", 100, "", 1, "Kalemler", "", "", ""]], detectMapping(HEADERS), { mode: "tam", vatPercent: 20 });
    expect(rows[0].priceKurus).toBe(12000);
  });

  it("hatalı satırları satır numarasıyla bildirir ve diğerlerini okur", () => {
    const { rows, errors } = parseRows(
      [
        HEADERS,
        ["", "", "Adsız stok kodu", 10, "", 1, "Kalemler", "", "", ""],
        ["B1", "", "Fiyatsız", "abc", "", 1, "Kalemler", "", "", ""],
        ["B2", "", "Tamam", 10, "", 1, "Kalemler", "", "", ""],
        ["B2", "", "Aynı kod tekrar", 10, "", 1, "Kalemler", "", "", ""],
        [null, null, null, null, null, null, null, null, null, null],
      ],
      detectMapping(HEADERS),
      { mode: "tam", vatPercent: null },
    );
    expect(rows.map((row) => row.sku)).toEqual(["B2"]);
    expect(errors.map((error) => error.line)).toEqual([2, 3, 5]);
  });

  it("eksi ve ondalıklı stoğu düzeltip uyarır; boş stok sıfırdır", () => {
    const { rows, warnings } = parseRows(
      [HEADERS, ["C1", "", "Ürün bir", 10, "", -3, "Kalemler", "", "", ""], ["C2", "", "Ürün iki", 10, "", 2.7, "Kalemler", "", "", ""], ["C3", "", "Ürün üç", 10, "", "", "Kalemler", "", "", ""]],
      detectMapping(HEADERS),
      { mode: "tam", vatPercent: null },
    );
    expect(rows.map((row) => row.stock)).toEqual([0, 2, 0]);
    expect(warnings).toHaveLength(2);
  });

  it("eski fiyat satış fiyatından yüksek değilse yok sayar", () => {
    const { rows, warnings } = parseRows([HEADERS, ["D1", "", "Ürün", 100, 90, 1, "Kalemler", "", "", ""]], detectMapping(HEADERS), { mode: "tam", vatPercent: null });
    expect(rows[0].compareAtKurus).toBeNull();
    expect(warnings).toHaveLength(1);
  });
});

describe("planImport", () => {
  it("yeni ürün ekler, var olanın stok ve fiyatını günceller, değişmeyeni sayar", () => {
    const plan = run([
      HEADERS,
      ["K-100", "8690000000001", "Klasik Dolma Kalem", 499.9, "", 4, "Kalemler", "", "", ""],
      ["N-1", "", "Yeni Defter A5", 59.9, "", 20, "Kırtasiye > Defterler", "", "", ""],
      ["K-100x", "", "Kalem Kapağı", 1, "", 1, "Kalemler", "", "", ""],
    ]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]).toMatchObject({ id: "p1", stock: 4, priceKurus: 49990 });
    expect(plan.updates[0].changes).toEqual(["stok 10 → 4", "fiyat 449.9 → 499.9"]);
    expect(plan.creates.map((create) => create.sku)).toEqual(["N-1", "K-100x"]);
    expect(plan.creates[0]).toMatchObject({ slug: "yeni-defter-a5", priceKurus: 5990, stock: 20, isActive: true, category: { id: "c-def" } });

    const same = run([HEADERS, ["K-100", "", "Klasik Dolma Kalem", 449.9, "", 10, "", "", "", ""]]);
    expect(same.unchanged).toBe(1);
    expect(same.updates).toHaveLength(0);
  });

  it("stok modunda yeni ürün eklemez, yalnızca stok ve fiyat değişir", () => {
    const plan = run(
      [
        ["Stok Kodu", "Stok", "Ürün Adı"],
        ["K-100", 3, "Başka ad"],
        ["YOK-1", 5, "Katalogda yok"],
      ],
      options({ mode: "stok" }),
    );
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates[0]).toMatchObject({ stock: 3, name: "Klasik Dolma Kalem" });
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0].line).toBe(3);
  });

  it("açık siparişlerin ayırdığı adedi stoktan düşer, eksiye düşürmez", () => {
    const rows = [["Stok Kodu", "Stok"], ["K-100", 6]];
    const plan = run(rows, options({ mode: "stok", subtractReserved: true }), { reserved: new Map([["p1", 2]]) });
    expect(plan.updates[0].stock).toBe(4);
    const over = run(rows, options({ mode: "stok", subtractReserved: true }), { reserved: new Map([["p1", 9]]) });
    expect(over.updates[0].stock).toBe(0);
  });

  it("bilinmeyen kategoriyi seçeneğe göre hata sayar ya da oluşturur", () => {
    const rows = [HEADERS, ["Z-1", "", "Yeni Ürün", 10, "", 1, "Oyuncaklar > Puzzle", "", "", ""]];
    expect(run(rows).errors[0].message).toContain("Kategori bulunamadı");
    const plan = run(rows, options({ createCategories: true }));
    expect(plan.errors).toEqual([]);
    expect(plan.newCategories).toEqual([{ path: ["Oyuncaklar", "Puzzle"], rows: 1 }]);
    expect(plan.creates[0].category).toEqual({ path: ["Oyuncaklar", "Puzzle"] });
  });

  it("aynı addaki iki ürüne farklı adres (slug) verir", () => {
    const plan = run([HEADERS, ["S-1", "", "Klasik Dolma Kalem", 10, "", 1, "Kalemler", "", "", ""], ["S-2", "", "Klasik Dolma Kalem", 10, "", 1, "Kalemler", "", "", ""]]);
    const slugs = plan.creates.map((create) => create.slug);
    expect(new Set(slugs).size).toBe(2);
    expect(slugs).not.toContain("klasik-dolma-kalem");
  });

  it("barkodu başka ürüne ait satırı reddeder", () => {
    const plan = run([HEADERS, ["N-9", "8690000000001", "Çakışan", 10, "", 1, "Kalemler", "", "", ""]]);
    expect(plan.creates).toHaveLength(0);
    expect(plan.errors[0].message).toContain("başka bir stok koduna ait");
  });

  it("yeni markaları toplar ve var olan markayı yeniden oluşturmaz", () => {
    const plan = run(
      [HEADERS, ["M-1", "", "Ürün", 10, "", 1, "Kalemler", "pelikan", "", ""], ["M-2", "", "Ürün iki", 10, "", 1, "Kalemler", "Yeni Marka", "", ""]],
      options(),
      { brands: [{ id: "b1", name: "Pelikan" }] },
    );
    expect(plan.newBrands).toEqual(["Yeni Marka"]);
  });
});

describe("Excel dosyasından uçtan uca", () => {
  it(".xlsx yazıp okuyunca aynı plan çıkar", async () => {
    const buffer = await writeXlsxFile([
      HEADERS,
      ["K-100", 8690000000001, "Klasik Dolma Kalem", 499.9, null, 4, "Kalemler", null, null, null],
      ["N-1", null, "Yeni Defter", 59.9, null, 20, "Kırtasiye > Defterler", "Pelikan", null, "evet"],
    ]).toBuffer();
    const data = await readSheet(buffer);
    const mapping = detectMapping(data[0] as string[]);
    expect(missingFields(mapping, "tam")).toEqual([]);

    const parsed = parseRows(data as unknown[][], mapping, { mode: "tam", vatPercent: null });
    const plan = planImport({ rows: parsed.rows, existing, categories, brands: [], reserved: new Map(), options: options() }, parsed.errors, parsed.warnings);
    expect(plan.errors).toEqual([]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.creates).toHaveLength(1);
    expect(plan.newBrands).toEqual(["Pelikan"]);
  });
});
