import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

// paytr.ts veritabanını içe aktarır; burada yalnızca imza ve biçim yardımcıları sınanır.
vi.mock("@/lib/db", () => ({ db: {} }));

const { fromMerchantOid, paytrBasket, paytrCallbackHash, paytrTokenHash, toMerchantOid, verifyPaytrCallback } = await import("@/lib/paytr");

const KEY = "test-anahtar";
const SALT = "test-tuz";

describe("PayTR sipariş numarası", () => {
  it("tireleri atar ve geri çevirir", () => {
    expect(toMerchantOid("MK-261127-7HQ4KD")).toBe("MK2611277HQ4KD");
    expect(fromMerchantOid("MK2611277HQ4KD")).toBe("MK-261127-7HQ4KD");
  });

  it("biçime uymayan numarayı tanımaz", () => {
    expect(fromMerchantOid("ABC123")).toBeNull();
    expect(fromMerchantOid("MK2611277HQ4KD9")).toBeNull();
  });
});

describe("paytrBasket", () => {
  it("[ad, \"18.00\", adet] satırlarını UTF-8 base64 JSON yapar", () => {
    const basket = paytrBasket([{ name: "Kurşun kalem", unitPriceKurus: 1850, quantity: 2 }]);
    expect(JSON.parse(Buffer.from(basket, "base64").toString("utf8"))).toEqual([["Kurşun kalem", "18.50", 2]]);
  });
});

describe("paytrTokenHash", () => {
  it("dokümandaki sırayla birleştirir, tuzu sona ekler, HMAC-SHA256 base64 üretir", () => {
    const fields = {
      merchantId: "123456",
      userIp: "1.2.3.4",
      merchantOid: "MK2611277HQ4KD",
      email: "a@b.com",
      paymentAmount: 12500,
      userBasket: "W10=",
      noInstallment: "1",
      maxInstallment: "0",
      currency: "TL",
      testMode: "1",
    };
    const expected = createHmac("sha256", KEY)
      .update("1234561.2.3.4MK2611277HQ4KDa@b.com12500W10=10TL1" + SALT)
      .digest("base64");
    expect(paytrTokenHash(fields, KEY, SALT)).toBe(expected);
  });
});

describe("verifyPaytrCallback", () => {
  afterEach(() => vi.unstubAllEnvs());

  function stubConfig() {
    vi.stubEnv("PAYTR_MERCHANT_ID", "123456");
    vi.stubEnv("PAYTR_MERCHANT_KEY", KEY);
    vi.stubEnv("PAYTR_MERCHANT_SALT", SALT);
  }

  function callback(fields: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return form;
  }

  it("imzası doğru başarılı bildirimi kabul eder", () => {
    stubConfig();
    const hash = createHmac("sha256", KEY).update("MK2611277HQ4KD" + SALT + "success" + "12500").digest("base64");
    expect(paytrCallbackHash("MK2611277HQ4KD", "success", "12500", KEY, SALT)).toBe(hash);
    const result = verifyPaytrCallback(callback({ merchant_oid: "MK2611277HQ4KD", status: "success", total_amount: "12500", hash }));
    expect(result).toMatchObject({ ok: true, orderNo: "MK-261127-7HQ4KD", status: "success", totalAmount: 12500 });
  });

  it("imzası tutmayan ya da değiştirilmiş bildirimi reddeder", () => {
    stubConfig();
    const hash = paytrCallbackHash("MK2611277HQ4KD", "failed", "12500", KEY, SALT);
    expect(verifyPaytrCallback(callback({ merchant_oid: "MK2611277HQ4KD", status: "success", total_amount: "12500", hash })).ok).toBe(false);
    expect(verifyPaytrCallback(callback({ merchant_oid: "MK2611277HQ4KD", status: "success", total_amount: "12500", hash: "x" })).ok).toBe(false);
  });

  it("PayTR ayarları yoksa hiçbir bildirimi kabul etmez", () => {
    const hash = paytrCallbackHash("MK2611277HQ4KD", "success", "12500", KEY, SALT);
    expect(verifyPaytrCallback(callback({ merchant_oid: "MK2611277HQ4KD", status: "success", total_amount: "12500", hash })).ok).toBe(false);
  });
});
