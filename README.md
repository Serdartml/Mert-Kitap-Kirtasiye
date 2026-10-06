# Mert Kitap Kırtasiye - E-ticaret

Next.js (App Router) + TypeScript + Tailwind CSS v4 + Prisma.

## Kurulum

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run db:push           # şemayı prisma/dev.db içine kurar
npm run db:seed           # ÖRNEK kategori ve ürünleri yükler
npm run dev               # http://localhost:3000
```

Diğer komutlar: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run db:studio`.

## Yapı

```
prisma/schema.prisma      veri modeli
prisma/seed.ts            örnek katalog (gerçek ürün değil)
src/app/(store)/          vitrin sayfaları (header + footer'lı)
src/actions/              server action'lar (sepet, iletişim formu)
src/components/           arayüz bileşenleri
src/lib/site.ts           mağaza bilgileri (adres, telefon, saatler, metinler)
src/lib/catalog.ts        ürün ve kategori sorguları
src/lib/cart.ts           çerez tabanlı misafir sepeti
src/lib/auth.ts           oturum okuma (giriş arayüzü gelince kullanılacak)
src/app/globals.css       renk paleti ve ortak sınıflar
```

## Sayfalar

| Yol | Durum |
| --- | --- |
| `/` | Ana sayfa |
| `/kategori/[slug]` | Listeleme, sıralama, stok filtresi, sayfalama |
| `/urun/[slug]` | Ürün detayı |
| `/arama?q=` | Arama |
| `/sepet` | Sepet |
| `/odeme` | Yer tutucu; ödeme sağlayıcısı bağlanacak |
| `/giris`, `/kayit` | Yer tutucu; üyelik ertelendi |
| `/hakkimizda`, `/iletisim` | Hazır |
| `/bilgi/[slug]` | KVKK, gizlilik vb.; metinler yazılacak |

## Bilinen eksikler

- **Logo:** `src/components/Logo.tsx` içinde logonun yeri kesik çizgili kutuyla ayrıldı; `src/app/icon.svg` (favicon) geçici. Gerçek logo `public/logo.svg` olarak eklenip bu iki yer güncellenecek.
- **Ürün görselleri:** Görseli olmayan ürünlerde kategori ikonlu yer tutucu çıkar. Görseller `ProductImage` tablosuna eklenir.
- **Üyelik:** `User`, `Session`, `Address`, `Favorite`, `Review` tabloları ve `lib/auth.ts` hazır; form ve parola doğrulama yok.
- **Ödeme ve sipariş:** `Order` / `OrderItem` tabloları hazır; ödeme entegrasyonu ve sipariş oluşturma yok.
- **Yönetim paneli:** Yok. Ürünler şimdilik seed veya `npm run db:studio` ile girilir.
- **Yasal metinler:** `/bilgi/*` sayfaları boş.

## PostgreSQL'e geçiş

Yerelde kurulum gerektirmesin diye SQLite kullanılıyor. Canlı ortam için:

1. `prisma/schema.prisma` içinde `provider = "postgresql"` yapın.
2. `DATABASE_URL` değerini PostgreSQL bağlantı adresiyle değiştirin.
3. `npx prisma migrate dev --name init` ile ilk migration'ı oluşturun.
4. `src/lib/catalog.ts` içindeki aramada `contains` filtrelerine `mode: "insensitive"` ekleyin
   (SQLite'ta Türkçe karakterlerde büyük/küçük harf duyarsız arama çalışmaz).
