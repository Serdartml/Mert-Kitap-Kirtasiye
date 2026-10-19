import { foldTr } from "./search-fold";
import { parsePriceToKurus, slugify } from "./slug";

// Excel'den ürün içe aktarma: sütun eşleme, satır doğrulama ve "ne değişecek" planı. Veritabanına dokunmaz (saf mantık,
// testlenebilir); okuma/yazma actions/product-import.ts içindedir. Önizleme ve uygulama aynı planı kullanır.

export type ImportMode = "stok" | "tam";

export interface ImportOptions {
  // stok: yalnızca var olan ürünlerin stok ve fiyatı güncellenir, yeni ürün eklenmez.
  // tam: yeni ürünler eklenir; var olanların adı, kategorisi, markası ve açıklaması da güncellenir.
  mode: ImportMode;
  // Dosyadaki fiyatlar KDV hariçse oran (%); site fiyatları KDV dahil tutar. Boş: fiyatlar zaten KDV dahil.
  vatPercent: number | null;
  // Dosyadaki bilinmeyen kategoriler oluşturulsun mu (kapalıysa o satırlar hatalı sayılır).
  createCategories: boolean;
  // Açık siparişlerin (henüz teslim edilmemiş) ayırdığı adet, dosyadaki stoktan düşülür.
  subtractReserved: boolean;
}

// ---------- Sütun eşleme ----------

export const IMPORT_FIELDS = [
  { key: "sku", label: "Stok kodu", hint: "Her ürün için benzersiz" },
  { key: "barcode", label: "Barkod", hint: "İsteğe bağlı" },
  { key: "name", label: "Ürün adı", hint: "Yeni ürün eklerken gerekli" },
  { key: "price", label: "Satış fiyatı", hint: "KDV dahil" },
  { key: "compareAt", label: "Eski fiyat", hint: "İndirim gösterimi için, isteğe bağlı" },
  { key: "stock", label: "Stok adedi", hint: "" },
  { key: "category", label: "Kategori", hint: "“Ana > Alt” ya da tek ad" },
  { key: "brand", label: "Marka", hint: "İsteğe bağlı" },
  { key: "description", label: "Açıklama", hint: "İsteğe bağlı" },
  { key: "active", label: "Aktif", hint: "evet/hayır; boşsa değişmez" },
] as const;

export type FieldKey = (typeof IMPORT_FIELDS)[number]["key"];
// Alan -> dosyadaki sütun sırası (0'dan). Eşlenmeyen alan yoktur.
export type Mapping = Partial<Record<FieldKey, number>>;

// Başlık adları tahmin edilirken kullanılan eş anlamlılar (harf/boşluk/Türkçe karakter farkı yok sayılır). Turna'nın
// gerçek sütun adları örnek dosya gelince buraya eklenir; arayüzde elle de seçilebilir.
const ALIASES: Record<FieldKey, string[]> = {
  sku: ["stokkodu", "urunkodu", "kod", "sku", "stokno", "malkodu", "stokkod", "urunno"],
  barcode: ["barkod", "barkodno", "barcode", "ean", "barkodu"],
  name: ["urunadi", "stokadi", "urunismi", "stokismi", "isim", "adi", "ad", "malinadi", "urun", "malcinsi", "urunaciklamasi"],
  price: ["satisfiyati", "satisfiyat", "fiyat", "perakendefiyat", "kdvlifiyat", "kdvdahilfiyat", "birimfiyat", "tutar", "etiketfiyati"],
  compareAt: ["eskifiyat", "indirimsizfiyat", "listefiyati", "listefiyat", "uzerinecizilifiyat"],
  stock: ["stokadedi", "stok", "miktar", "adet", "mevcut", "bakiye", "stokmiktari", "kalan", "mevcutstok"],
  category: ["kategori", "kategoriadi", "grup", "grubu", "stokgrubu", "anagrup", "urungrubu"],
  brand: ["marka", "markaadi", "uretici"],
  description: ["aciklama", "detay", "urundetayi", "ozellikler"],
  active: ["aktif", "durum", "satista", "satistami", "aktifpasif", "yayinda"],
};

const normalizeHeader = (header: string) => foldTr(header).replace(/[^a-z0-9]/g, "");

// Başlık satırından alan -> sütun eşlemesini tahmin eder. Önce birebir eş anlamlılar (en güvenilir), her sütun en
// fazla bir alana gider.
export function detectMapping(headers: string[]): Mapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: Mapping = {};
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS) {
    for (const alias of ALIASES[field.key]) {
      const index = normalized.findIndex((header, position) => header === alias && !used.has(position));
      if (index >= 0) {
        mapping[field.key] = index;
        used.add(index);
        break;
      }
    }
  }
  return mapping;
}

// Seçilen moda göre eksik zorunlu alanlar (boşsa eşleme yeterli).
export function missingFields(mapping: Mapping, mode: ImportMode): string[] {
  const label = (key: FieldKey) => IMPORT_FIELDS.find((field) => field.key === key)!.label;
  const missing: string[] = [];
  if (mode === "tam") {
    for (const key of ["sku", "name", "price", "stock"] as const) if (mapping[key] === undefined) missing.push(label(key));
  } else {
    if (mapping.sku === undefined && mapping.barcode === undefined) missing.push(`${label("sku")} ya da ${label("barcode")}`);
    if (mapping.price === undefined && mapping.stock === undefined) missing.push(`${label("stock")} ya da ${label("price")}`);
  }
  return missing;
}

// ---------- Satırları okuma ----------

export interface ParsedRow {
  line: number;
  sku: string;
  barcode: string | null;
  name: string;
  // null: dosyada yok / boş (stok modunda mevcut değer korunur).
  priceKurus: number | null;
  // undefined: sütun eşlenmemiş (dokunma); null: sütun var ama boş (eski fiyatı kaldır).
  compareAtKurus: number | null | undefined;
  stock: number | null;
  categoryPath: string[] | null;
  brandName: string | null;
  description: string | null;
  isActive: boolean | null;
}

export interface RowIssue {
  line: number;
  sku: string;
  message: string;
}

const MAX_STOCK = 1_000_000;
const MAX_PRICE_KURUS = 100_000_000;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return "";
  // Excel'de sayı olarak tutulan kodlar ve barkodlar ("8690000000001") 1e21 altında olduğundan tam yazılır.
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value).trim();
}

function cellKurus(value: unknown, vatPercent: number | null): number | null | "invalid" {
  let kurus: number | null;
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  if (typeof value === "number") kurus = Number.isFinite(value) ? Math.round(value * 100) : null;
  else kurus = parsePriceToKurus(String(value));
  if (kurus === null || kurus < 0 || kurus > MAX_PRICE_KURUS) return "invalid";
  return vatPercent ? Math.round(kurus * (1 + vatPercent / 100)) : kurus;
}

const TRUE_WORDS = new Set(["evet", "e", "1", "true", "aktif", "var", "yayinda", "acik"]);
const FALSE_WORDS = new Set(["hayir", "h", "0", "false", "pasif", "yok", "kapali"]);

export function parseRows(data: unknown[][], mapping: Mapping, options: Pick<ImportOptions, "mode" | "vatPercent">) {
  const rows: ParsedRow[] = [];
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const seenSku = new Set<string>();
  const get = (row: unknown[], key: FieldKey) => (mapping[key] === undefined ? undefined : row[mapping[key]!]);

  // data[0] başlık satırı; satır numaraları Excel'deki gibi (başlık = 1).
  for (let index = 1; index < data.length; index++) {
    const row = data[index] ?? [];
    const line = index + 1;
    if (row.every((cell) => cellText(cell) === "")) continue;

    const sku = cellText(get(row, "sku"));
    const barcode = cellText(get(row, "barcode")) || null;
    const label = sku || barcode || "";
    const fail = (message: string) => errors.push({ line, sku: label, message });
    const warn = (message: string) => warnings.push({ line, sku: label, message });

    if (mapping.sku !== undefined && !sku) {
      fail("Stok kodu boş.");
      continue;
    }
    if (mapping.sku === undefined && !barcode) {
      fail("Barkod boş.");
      continue;
    }
    if (sku.length > 60) {
      fail("Stok kodu 60 karakterden uzun.");
      continue;
    }
    if (barcode && barcode.length > 40) {
      fail("Barkod 40 karakterden uzun.");
      continue;
    }
    const duplicateKey = sku || `barkod:${barcode}`;
    if (seenSku.has(duplicateKey)) {
      fail("Bu stok kodu dosyada daha önce geçti; ilk satır kullanıldı.");
      continue;
    }
    seenSku.add(duplicateKey);

    const name = cellText(get(row, "name")).slice(0, 200);
    if (options.mode === "tam" && name.length < 2) {
      fail("Ürün adı boş ya da çok kısa.");
      continue;
    }

    const priceCell = cellKurus(get(row, "price"), options.vatPercent);
    if (priceCell === "invalid") {
      fail("Fiyat geçersiz (örnek: 449,90).");
      continue;
    }
    if (mapping.price !== undefined && priceCell === null && options.mode === "tam") {
      fail("Fiyat boş.");
      continue;
    }
    if (priceCell === 0 && options.mode === "tam") {
      fail("Fiyat sıfır olamaz.");
      continue;
    }

    let compareAt: number | null | undefined;
    if (mapping.compareAt !== undefined) {
      const parsedCompare = cellKurus(get(row, "compareAt"), options.vatPercent);
      if (parsedCompare === "invalid") {
        warn("Eski fiyat geçersiz; yok sayıldı.");
        compareAt = null;
      } else {
        compareAt = parsedCompare;
        // İndirim anlamlı olsun: eski fiyat satış fiyatından yüksek olmalı (yönetim formundaki kural).
        if (compareAt !== null && priceCell !== null && compareAt <= priceCell) {
          warn("Eski fiyat satış fiyatından yüksek değil; yok sayıldı.");
          compareAt = null;
        }
      }
    }

    let stock: number | null = null;
    const stockRaw = get(row, "stock");
    if (mapping.stock !== undefined) {
      const text = cellText(stockRaw).replace(",", ".");
      // Boş stok hücresi sıfır sayılır (stok programları sıfırı boş bırakabilir).
      const number = text === "" ? 0 : Number(text);
      if (!Number.isFinite(number)) {
        fail("Stok sayı olmalı.");
        continue;
      }
      if (number > MAX_STOCK) {
        fail("Stok çok büyük.");
        continue;
      }
      stock = Math.max(0, Math.floor(number));
      if (number < 0) warn("Stok eksi; 0 yapıldı.");
      else if (!Number.isInteger(number)) warn("Stok ondalıklı; aşağı yuvarlandı.");
    }

    const pathText = cellText(get(row, "category"));
    const categoryPath = pathText ? pathText.split(">").map((part) => part.trim()).filter(Boolean) : null;
    if (categoryPath && categoryPath.length > 2) {
      fail("Kategori en fazla iki seviye olabilir (“Ana > Alt”).");
      continue;
    }

    let isActive: boolean | null = null;
    const activeText = foldTr(cellText(get(row, "active")));
    if (activeText) {
      if (TRUE_WORDS.has(activeText)) isActive = true;
      else if (FALSE_WORDS.has(activeText)) isActive = false;
      else warn(`“${activeText}” aktif/pasif olarak anlaşılmadı; durum değişmedi.`);
    }

    rows.push({
      line,
      sku,
      barcode,
      name,
      priceKurus: priceCell,
      compareAtKurus: compareAt,
      stock,
      categoryPath,
      brandName: cellText(get(row, "brand")).slice(0, 80) || null,
      description: cellText(get(row, "description")).slice(0, 5000) || null,
      isActive,
    });
  }
  return { rows, errors, warnings };
}

// ---------- Plan: dosya + mevcut katalog -> eklenecek / güncellenecek ----------

export interface ExistingProduct {
  id: string;
  sku: string;
  barcode: string | null;
  slug: string;
  name: string;
  description: string | null;
  priceKurus: number;
  compareAtKurus: number | null;
  stock: number;
  isActive: boolean;
  categoryId: string;
  brandId: string | null;
}

export interface CategoryRef {
  id: string;
  name: string;
  parentId: string | null;
}

export interface BrandRef {
  id: string;
  name: string;
}

// Kategori: var olan (id) ya da oluşturulacak (yol).
export type CategoryTarget = { id: string } | { path: string[] };

export interface PlannedCreate {
  line: number;
  sku: string;
  barcode: string | null;
  name: string;
  slug: string;
  description: string | null;
  priceKurus: number;
  compareAtKurus: number | null;
  stock: number;
  isActive: boolean;
  category: CategoryTarget;
  brandName: string | null;
}

// Güncellenen ürünün SONUÇ değerleri (mevcut + değişiklikler); toplu SQL hepsini yazar.
export interface PlannedUpdate {
  line: number;
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  priceKurus: number;
  compareAtKurus: number | null;
  stock: number;
  isActive: boolean;
  category: CategoryTarget;
  brandName: string | null;
  brandId: string | null;
  // Önizleme için: hangi alanlar neden değişiyor.
  changes: string[];
}

export interface ImportPlan {
  creates: PlannedCreate[];
  updates: PlannedUpdate[];
  unchanged: number;
  errors: RowIssue[];
  warnings: RowIssue[];
  newCategories: { path: string[]; rows: number }[];
  newBrands: string[];
}

const categoryKey = (path: string[]) => path.map(foldTr).join(">");

export interface PlanInput {
  rows: ParsedRow[];
  existing: ExistingProduct[];
  categories: CategoryRef[];
  brands: BrandRef[];
  // Ürün id -> açık siparişlerin ayırdığı adet.
  reserved: Map<string, number>;
  options: ImportOptions;
}

export function planImport(input: PlanInput, parseErrors: RowIssue[] = [], parseWarnings: RowIssue[] = []): ImportPlan {
  const { rows, existing, categories, brands, reserved, options } = input;
  const errors = [...parseErrors];
  const warnings = [...parseWarnings];
  const creates: PlannedCreate[] = [];
  const updates: PlannedUpdate[] = [];
  let unchanged = 0;

  const bySku = new Map(existing.map((product) => [product.sku, product]));
  const byBarcode = new Map(existing.flatMap((product) => (product.barcode ? [[product.barcode, product] as const] : [])));
  const usedSlugs = new Set(existing.map((product) => product.slug));
  const usedBarcodes = new Set(byBarcode.keys());
  const usedSkus = new Set(bySku.keys());

  // Kategori çözümleme: "Ana > Alt" yolu ya da tek ad (ana veya alt kategoride aranır).
  const roots = categories.filter((category) => !category.parentId);
  const childrenOf = (rootId: string) => categories.filter((category) => category.parentId === rootId);
  const brandByName = new Map(brands.map((brand) => [foldTr(brand.name), brand]));
  const newBrandNames = new Map<string, string>();
  const newCategoryRows = new Map<string, { path: string[]; rows: number }>();

  type Resolved = { target: CategoryTarget } | { error: string };
  function resolveCategory(path: string[]): Resolved {
    if (path.length === 2) {
      const root = roots.find((category) => foldTr(category.name) === foldTr(path[0]));
      const child = root ? childrenOf(root.id).find((category) => foldTr(category.name) === foldTr(path[1])) : undefined;
      if (child) return { target: { id: child.id } };
      return options.createCategories ? { target: { path } } : { error: `Kategori bulunamadı: ${path.join(" > ")}` };
    }
    const matches = categories.filter((category) => foldTr(category.name) === foldTr(path[0]));
    if (matches.length === 1) return { target: { id: matches[0].id } };
    if (matches.length > 1) return { error: `“${path[0]}” birden fazla kategoriyle eşleşti; “Ana > Alt” biçiminde yazın.` };
    return options.createCategories ? { target: { path } } : { error: `Kategori bulunamadı: ${path[0]}` };
  }

  function takeSlug(name: string, sku: string): string {
    const base = slugify(name) || slugify(sku) || "urun";
    let slug = base;
    if (usedSlugs.has(slug)) slug = `${base.slice(0, 70)}-${slugify(sku)}`.slice(0, 80);
    for (let counter = 2; usedSlugs.has(slug); counter++) slug = `${base.slice(0, 74)}-${counter}`;
    usedSlugs.add(slug);
    return slug;
  }

  const stockFor = (row: ParsedRow, productId: string | null): number | null => {
    if (row.stock === null) return null;
    const held = options.subtractReserved && productId ? (reserved.get(productId) ?? 0) : 0;
    return Math.max(0, row.stock - held);
  };

  for (const row of rows) {
    const label = row.sku || row.barcode || "";
    const fail = (message: string) => errors.push({ line: row.line, sku: label, message });

    const bySkuHit = row.sku ? bySku.get(row.sku) : undefined;
    const byBarcodeHit = row.barcode ? byBarcode.get(row.barcode) : undefined;
    if (bySkuHit && byBarcodeHit && bySkuHit.id !== byBarcodeHit.id) {
      fail(`Barkod başka bir ürüne ait (${byBarcodeHit.sku}).`);
      continue;
    }
    const found = bySkuHit ?? (row.sku ? undefined : byBarcodeHit);
    if (!bySkuHit && row.sku && byBarcodeHit) {
      fail(`Barkod başka bir stok koduna ait (${byBarcodeHit.sku}).`);
      continue;
    }

    // ----- Var olan ürün: güncelle -----
    if (found) {
      const changes: string[] = [];
      const next = { ...found } as ExistingProduct & { categoryTarget: CategoryTarget; brandName: string | null };
      next.categoryTarget = { id: found.categoryId };
      next.brandName = null;

      const stock = stockFor(row, found.id);
      if (stock !== null && stock !== found.stock) {
        changes.push(`stok ${found.stock} → ${stock}`);
        next.stock = stock;
      }
      if (row.priceKurus !== null && row.priceKurus !== found.priceKurus) {
        changes.push(`fiyat ${found.priceKurus / 100} → ${row.priceKurus / 100}`);
        next.priceKurus = row.priceKurus;
      }
      if (row.compareAtKurus !== undefined) {
        // Fiyat bu satırda da değişiyorsa indirim kuralı yeni fiyata göre denetlenir.
        const compare = row.compareAtKurus !== null && row.compareAtKurus <= next.priceKurus ? null : row.compareAtKurus;
        if (compare !== found.compareAtKurus) {
          changes.push("eski fiyat");
          next.compareAtKurus = compare;
        }
      }
      if (row.isActive !== null && row.isActive !== found.isActive) {
        changes.push(row.isActive ? "yayına alındı" : "yayından kalktı");
        next.isActive = row.isActive;
      }
      if (options.mode === "tam") {
        if (row.name && row.name !== found.name) {
          changes.push("ad");
          next.name = row.name;
        }
        if (row.description && row.description !== found.description) {
          changes.push("açıklama");
          next.description = row.description;
        }
        if (row.categoryPath) {
          const resolved = resolveCategory(row.categoryPath);
          if ("error" in resolved) {
            fail(resolved.error);
            continue;
          }
          const changed = !("id" in resolved.target) || resolved.target.id !== found.categoryId;
          if (changed) {
            changes.push("kategori");
            next.categoryTarget = resolved.target;
            if (!("id" in resolved.target)) countNewCategory(row.categoryPath);
          }
        }
        if (row.brandName) {
          const brand = brandByName.get(foldTr(row.brandName));
          if (!brand || brand.id !== found.brandId) {
            changes.push("marka");
            next.brandName = row.brandName;
            if (!brand) newBrandNames.set(foldTr(row.brandName), row.brandName);
          }
        }
      }
      if (row.barcode && !found.barcode && !usedBarcodes.has(row.barcode)) {
        changes.push("barkod");
        next.barcode = row.barcode;
        usedBarcodes.add(row.barcode);
      }

      if (changes.length === 0) {
        unchanged++;
        continue;
      }
      updates.push({
        line: row.line,
        id: found.id,
        sku: found.sku,
        barcode: next.barcode,
        name: next.name,
        description: next.description,
        priceKurus: next.priceKurus,
        compareAtKurus: next.compareAtKurus,
        stock: next.stock,
        isActive: next.isActive,
        category: next.categoryTarget,
        brandName: next.brandName,
        brandId: next.brandName ? (brandByName.get(foldTr(next.brandName))?.id ?? null) : found.brandId,
        changes,
      });
      continue;
    }

    // ----- Dosyada olup katalogda olmayan ürün -----
    if (options.mode === "stok") {
      fail("Katalogda bulunamadı (stok/fiyat güncellemesinde yeni ürün eklenmez).");
      continue;
    }
    if (!row.sku) {
      fail("Yeni ürün için stok kodu gerekli.");
      continue;
    }
    if (usedSkus.has(row.sku)) {
      fail("Bu stok kodu zaten kullanılıyor.");
      continue;
    }
    if (row.barcode && usedBarcodes.has(row.barcode)) {
      fail("Bu barkod başka bir üründe kullanılıyor.");
      continue;
    }
    if (!row.categoryPath) {
      fail("Yeni ürün için kategori gerekli.");
      continue;
    }
    if (row.priceKurus === null) {
      fail("Fiyat boş.");
      continue;
    }
    const resolved = resolveCategory(row.categoryPath);
    if ("error" in resolved) {
      fail(resolved.error);
      continue;
    }
    if (!("id" in resolved.target)) countNewCategory(row.categoryPath);
    if (row.brandName && !brandByName.has(foldTr(row.brandName))) newBrandNames.set(foldTr(row.brandName), row.brandName);

    usedSkus.add(row.sku);
    if (row.barcode) usedBarcodes.add(row.barcode);
    creates.push({
      line: row.line,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      slug: takeSlug(row.name, row.sku),
      description: row.description,
      priceKurus: row.priceKurus,
      compareAtKurus: row.compareAtKurus ?? null,
      stock: row.stock ?? 0,
      isActive: row.isActive ?? true,
      category: resolved.target,
      brandName: row.brandName,
    });
  }

  function countNewCategory(path: string[]) {
    const key = categoryKey(path);
    const entry = newCategoryRows.get(key);
    if (entry) entry.rows++;
    else newCategoryRows.set(key, { path, rows: 1 });
  }

  return {
    creates,
    updates,
    unchanged,
    errors: errors.sort((a, b) => a.line - b.line),
    warnings,
    newCategories: [...newCategoryRows.values()],
    newBrands: [...newBrandNames.values()],
  };
}
