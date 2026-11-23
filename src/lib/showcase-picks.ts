import { foldTr } from "./search-fold";

// Ana sayfa seçkisi için ürünün sınıf / sınav grubu: "8.sınıf" -> "8", "Tyt ..." -> "tyt". Bulunamazsa "diger".
export function gradeKey(name: string): string {
  const folded = foldTr(name);
  const grade = folded.match(/(?<!\d)(\d{1,2})\.\s?sinif/)?.[1];
  if (grade) return grade;
  return folded.match(/\b(tyt|ayt|lgs|kpss|ales|dgs|yds|ydt|msu)\b/)?.[1] ?? "diger";
}

// Listeden en fazla `limit` ürün seçer: gruplar (sınıflar) sırayla birer ürün verir, her grupta o ana kadar en az
// seçilmiş yayınevinin ürünü alınır. Eşitlikte listedeki ilk ürün kazanır; aynı veri her zaman aynı seçkiyi verir.
export function pickDiverse<T>(items: T[], limit: number, groupOf: (item: T) => string, publisherOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const used = new Map<string, number>();
  const picked: T[] = [];
  while (picked.length < limit) {
    let tookAny = false;
    for (const queue of groups.values()) {
      if (picked.length >= limit || queue.length === 0) continue;
      let best = 0;
      for (let index = 1; index < queue.length; index++) {
        if ((used.get(publisherOf(queue[index])) ?? 0) < (used.get(publisherOf(queue[best])) ?? 0)) best = index;
      }
      const [item] = queue.splice(best, 1);
      const publisher = publisherOf(item);
      used.set(publisher, (used.get(publisher) ?? 0) + 1);
      picked.push(item);
      tookAny = true;
    }
    if (!tookAny) break;
  }
  return picked;
}
