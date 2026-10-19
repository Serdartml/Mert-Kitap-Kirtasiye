import writeXlsxFile from "write-excel-file/node";
import { requireAdmin } from "@/lib/auth";

// Örnek Excel şablonu: başlıklar içe aktarmanın otomatik tanıdığı adlardır.
export async function GET() {
  await requireAdmin();

  const buffer = await writeXlsxFile([
    ["Stok Kodu", "Barkod", "Ürün Adı", "Satış Fiyatı", "Eski Fiyat", "Stok", "Kategori", "Marka", "Açıklama", "Aktif"],
    ["KLM-001", "8690000000011", "Klasik Dolma Kalem - Siyah", 449.9, 549.9, 12, "Kırtasiye > Kalemler", "Pelikan", "Çelik uçlu dolma kalem.", "evet"],
    ["DFT-101", "8690000000028", "A5 Çizgili Defter", 159.9, null, 40, "Kırtasiye > Defterler", null, null, "evet"],
  ]).toBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="urun-sablonu.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
