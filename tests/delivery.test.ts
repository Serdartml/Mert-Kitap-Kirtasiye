import { describe, expect, it } from "vitest";
import { courierEstimate, courierFeeKurus, isCourierDistrict, suffixTo } from "@/lib/delivery";
import { shippingTerms } from "@/lib/legal-content";

describe("kurye ücreti", () => {
  it("1.000 TL altı 100 TL, 1.000 TL ve üzeri ücretsiz", () => {
    expect(courierFeeKurus(3000)).toBe(10_000);
    expect(courierFeeKurus(99_999)).toBe(10_000);
    expect(courierFeeKurus(100_000)).toBe(0);
  });
});

describe("kurye ilçeleri", () => {
  it("yalnızca listedeki 11 merkez ilçeyi kabul eder", () => {
    expect(isCourierDistrict("Bornova")).toBe(true);
    expect(isCourierDistrict("Karşıyaka")).toBe(true);
    expect(isCourierDistrict("Torbalı")).toBe(false);
    expect(isCourierDistrict("bornova")).toBe(false);
  });

  it("yasal metinler aynı değerleri kullanır", () => {
    expect(shippingTerms.districts).toBe("Balçova, Bayraklı, Bornova, Buca, Çiğli, Gaziemir, Güzelbahçe, Karabağlar, Karşıyaka, Konak ve Narlıdere");
    expect(shippingTerms.fee).toBe("100");
    expect(shippingTerms.freeOver).toBe("1000");
    expect(shippingTerms.sameDayCutoff).toBe("17:00");
  });
});

describe("tahmini teslim (İstanbul saati)", () => {
  it("17:00'den önce bugün, sonra yarın; kapanış saatine kadar", () => {
    // 2026-11-27 Cuma. 13:00 UTC = 16:00 İstanbul.
    expect(courierEstimate(new Date("2026-11-27T13:00:00Z"))).toEqual({ sameDay: true, text: "Bugün 21:00'e kadar" });
    // 14:30 UTC = 17:30 İstanbul -> Cumartesi.
    expect(courierEstimate(new Date("2026-11-27T14:30:00Z"))).toEqual({ sameDay: false, text: "Yarın 21:00'e kadar" });
    // Cumartesi 18:00 İstanbul -> Pazar, mağaza 20:00'de kapanır.
    expect(courierEstimate(new Date("2026-11-28T15:00:00Z")).text).toBe("Yarın 20:00'ye kadar");
    // Pazar 10:00 İstanbul -> aynı gün 20:00.
    expect(courierEstimate(new Date("2026-11-29T07:00:00Z")).text).toBe("Bugün 20:00'ye kadar");
  });

  it("saat ekini okunuşa göre seçer", () => {
    expect(suffixTo("21:00")).toBe("'e");
    expect(suffixTo("20:00")).toBe("'ye");
    expect(suffixTo("19:00")).toBe("'a");
    expect(suffixTo("16:00")).toBe("'ya");
    expect(suffixTo("10:00")).toBe("'a");
  });
});
