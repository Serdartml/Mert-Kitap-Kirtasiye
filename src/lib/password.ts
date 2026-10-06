import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Parola özeti: Node'un yerleşik scrypt'i. Saklanan biçim: scrypt$<tuz>$<özet> (ikisi de base64url).
// Bu dosya "server-only" içe aktarmaz; scripts/create-admin.ts da kullanır.

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [scheme, saltPart, hashPart] = (stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltPart || !hashPart) return false;

  const expected = Buffer.from(hashPart, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltPart, "base64url"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Kullanıcı bulunamadığında da aynı süre harcansın diye doğrulanan sahte özet;
// yanıt süresinden "bu e-posta kayıtlı mı" bilgisi sızmaz.
export const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);
