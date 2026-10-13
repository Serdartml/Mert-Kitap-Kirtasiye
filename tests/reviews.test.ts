import { describe, expect, it } from "vitest";
import { averageRating, reviewerName } from "@/lib/reviews";

describe("reviewerName", () => {
  it("soyadını kısaltır", () => {
    expect(reviewerName("Ali Veli")).toBe("Ali V.");
    expect(reviewerName("Ayşe Nur  çelik")).toBe("Ayşe Nur Ç.");
  });

  it("tek isim ya da boş değerle hata vermez", () => {
    expect(reviewerName("Mert")).toBe("Mert");
    expect(reviewerName("   ")).toBe("Müşterimiz");
    expect(reviewerName(null)).toBe("Müşterimiz");
  });
});

describe("averageRating", () => {
  it("tek ondalıkla yuvarlar", () => {
    expect(averageRating([5, 4])).toBe(4.5);
    expect(averageRating([5, 5, 4])).toBe(4.7);
  });

  it("yorum yoksa null döner", () => {
    expect(averageRating([])).toBeNull();
  });
});
