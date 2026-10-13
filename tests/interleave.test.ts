import { describe, expect, it } from "vitest";
import { interleaveBy } from "@/lib/interleave";

const group = (item: string) => item[0];

describe("interleaveBy", () => {
  it("kategorileri sırayla karıştırır, grup içi sırayı korur", () => {
    expect(interleaveBy(["k1", "k2", "k3", "s1", "s2", "h1"], group)).toEqual(["k1", "s1", "h1", "k2", "s2", "k3"]);
  });

  it("gruplar ilk görülme sırasıyla dizilir", () => {
    expect(interleaveBy(["s1", "k1", "s2", "k2"], group)).toEqual(["s1", "k1", "s2", "k2"]);
  });

  it("hiçbir elemanı kaybetmez ya da çoğaltmaz", () => {
    const items = Array.from({ length: 40 }, (_, i) => `${"abcde"[i % 5]}${i}`);
    const result = interleaveBy(items, group);
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it("boş ve tek gruplu listeyle çalışır", () => {
    expect(interleaveBy([], group)).toEqual([]);
    expect(interleaveBy(["a1", "a2", "a3"], group)).toEqual(["a1", "a2", "a3"]);
  });
});