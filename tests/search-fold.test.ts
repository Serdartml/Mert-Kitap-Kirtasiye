import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escapeLike, foldTr, FOLD_FROM, FOLD_TO, searchTokens } from "@/lib/search-fold";

describe("foldTr", () => {
  it("büyük/küçük harf ve Türkçe karakter farkını yok sayar", () => {
    for (const text of ["Çizim", "çizim", "CIZIM", "cizim", "ÇİZİM"]) expect(foldTr(text)).toBe("cizim");
    expect(foldTr("Kırtasiye")).toBe("kirtasiye");
    expect(foldTr("KIRTASİYE")).toBe("kirtasiye");
    expect(foldTr("Öğrenci Şişe Ütü")).toBe("ogrenci sise utu");
  });

  it("eşleme tabloları aynı uzunlukta (SQL translate ile birebir)", () => {
    expect([...FOLD_FROM].length).toBe([...FOLD_TO].length);
  });

  it("SQL migration'ındaki ifade eşleme tablosuyla aynı", () => {
    const sql = readFileSync("prisma/migrations/20261019120000_arama_katlama_indeksleri/migration.sql", "utf8");
    expect(sql).toContain(`'${FOLD_FROM}', '${FOLD_TO}'`);
  });
});

describe("searchTokens", () => {
  it("kelimelere böler, katlar ve tekrarları atar", () => {
    expect(searchTokens("  Dolma   KALEM dolma ")).toEqual(["dolma", "kalem"]);
  });

  it("boş aramada boş liste döner", () => {
    expect(searchTokens("   ")).toEqual([]);
  });

  it("en fazla 6 kelime ve kelime başına 50 karakter alır", () => {
    expect(searchTokens("a b c d e f g h")).toHaveLength(6);
    expect(searchTokens("x".repeat(80))[0]).toHaveLength(50);
  });
});

describe("escapeLike", () => {
  it("LIKE'ta özel karakterleri kaçırır", () => {
    expect(escapeLike("%50_indirim!")).toBe("!%50!_indirim!!");
  });
});
