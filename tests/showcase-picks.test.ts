import { describe, expect, it } from "vitest";
import { gradeKey, pickDiverse } from "@/lib/showcase-picks";

interface Book {
  name: string;
  publisher: string;
}
const pick = (books: Book[], limit: number) => pickDiverse(books, limit, (book) => gradeKey(book.name), (book) => book.publisher);

describe("gradeKey", () => {
  it("sınıfı ve sınavı ayırır", () => {
    expect(gradeKey("Tonguç 8.sınıf Matematik-2026-27")).toBe("8");
    expect(gradeKey("Palme Tyt Tarih Soru-2026-27")).toBe("tyt");
    expect(gradeKey("Genel Kitap")).toBe("diger");
  });
});

describe("pickDiverse", () => {
  it("önce her sınıftan birer ürün alır", () => {
    const books = [{ name: "A 5.sınıf", publisher: "a" }, { name: "B 5.sınıf", publisher: "b" }, { name: "A 8.sınıf", publisher: "a" }, { name: "C Tyt", publisher: "c" }];
    expect(pick(books, 3).map((book) => gradeKey(book.name)).sort()).toEqual(["5", "8", "tyt"]);
  });
  it("aynı sınıfta az seçilmiş yayınevini tercih eder", () => {
    const books = [{ name: "A 5.sınıf", publisher: "a" }, { name: "A2 5.sınıf", publisher: "a" }, { name: "B 5.sınıf", publisher: "b" }];
    expect(pick(books, 2).map((book) => book.publisher)).toEqual(["a", "b"]);
  });
  it("sınırı aşmaz, ürün azsa hepsini verir", () => {
    const books = Array.from({ length: 30 }, (_, index) => ({ name: `K ${(index % 4) + 5}.sınıf ${index}`, publisher: `p${index % 7}` }));
    expect(pick(books, 20)).toHaveLength(20);
    expect(pick(books.slice(0, 3), 20)).toHaveLength(3);
  });
});
