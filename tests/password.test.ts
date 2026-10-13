import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";

describe("parola özeti", () => {
  it("doğru parolayı kabul, yanlışı reddeder", async () => {
    const hash = await hashPassword("güvenli-parola-1");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("güvenli-parola-1", hash)).toBe(true);
    expect(await verifyPassword("güvenli-parola-2", hash)).toBe(false);
  });

  it("aynı parola her seferinde farklı özet üretir (tuz)", async () => {
    expect(await hashPassword("aynı")).not.toBe(await hashPassword("aynı"));
  });

  it("bozuk ya da boş özetleri reddeder, hata fırlatmaz", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5$a$b")).toBe(false);
  });

  it("DUMMY_HASH geçerli biçimdedir ve hiçbir parolayla eşleşmez", async () => {
    expect(await verifyPassword("herhangi", DUMMY_HASH)).toBe(false);
  });
});
