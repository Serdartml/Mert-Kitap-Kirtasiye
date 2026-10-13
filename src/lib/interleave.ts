// Listeyi gruplara göre karıştırır: gruplar ilk görülme sırasıyla dizilir ve sırayla birer eleman alınır (round-robin).
// Her grubun kendi içindeki sırası korunur. Örnek: [k1, k2, k3, s1, s2, h1] (k: kırtasiye, s: sanatsal, h: hediyelik)
// -> [k1, s1, h1, k2, s2, k3]. İndirimli ürünler listesinde aynı kategorinin ürünleri arka arkaya dizilmesin diye kullanılır.
export function interleaveBy<T>(items: T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const queues = [...groups.values()];
  const result: T[] = [];
  for (let round = 0; result.length < items.length; round++) {
    for (const queue of queues) {
      if (round < queue.length) result.push(queue[round]);
    }
  }
  return result;
}