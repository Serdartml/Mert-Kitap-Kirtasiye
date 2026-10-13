import { describe, expect, it, vi } from "vitest";

// orders.ts veritabanı, oturum ve çerez modüllerini içe aktarır; burada yalnızca numara üretimi sınanır.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { generateOrderNo } = await import("@/lib/orders");

describe("generateOrderNo", () => {
  it("MK-YYAAGG-XXXXXX biçimindedir ve karışabilen karakter içermez", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderNo()).toMatch(/^MK-\d{6}-[2-9A-HJKMNP-Z]{6}$/);
    }
  });

  it("tarihi İstanbul saatine göre yazar", () => {
    // 31 Aralık 22:30 UTC = 1 Ocak 01:30 İstanbul.
    expect(generateOrderNo(new Date("2026-12-31T22:30:00Z"))).toMatch(/^MK-270101-/);
    expect(generateOrderNo(new Date("2026-10-07T10:00:00Z"))).toMatch(/^MK-261007-/);
  });

  it("art arda üretilen numaralar çakışmaz", () => {
    const numbers = new Set(Array.from({ length: 500 }, () => generateOrderNo()));
    expect(numbers.size).toBe(500);
  });
});
