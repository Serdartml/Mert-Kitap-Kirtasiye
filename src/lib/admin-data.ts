import "server-only";
import { db } from "./db";

// Yönetim formlarındaki kategori seçimi için: ana kategoriler ve altları. Önbelleksiz okunur.
export function getCategoryOptions() {
  return db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
    },
  });
}
