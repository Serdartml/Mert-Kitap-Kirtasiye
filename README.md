# Mert Kitap Kırtasiye - E-ticaret

Next.js (App Router) + TypeScript + Tailwind CSS v4 + Prisma.

## Kurulum

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env; sonra Neon adreslerini yazın
npm run db:deploy         # mevcut migration'ları veritabanına uygular
npm run db:seed           # ÖRNEK kategori ve ürünleri yükler
npm run dev               # http://localhost:3000
```

Veritabanı PostgreSQL (Neon). Şemayı değiştirdikten sonra `npm run db:migrate -- --name aciklama`
ile yeni migration oluşturun; `prisma/migrations/` klasörü git'e girer.

Diğer komutlar: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run db:studio`.

## Önbellek

Cache Components açık (`next.config.ts`). Sayfaların sabit kısmı build sırasında üretilir, katalog
sorguları (`src/lib/catalog.ts`) `"use cache"` ile önbellekten gelir: kategoriler saatte bir, ürün
verisi dakikada bir yenilenir. Sepet gibi çerez okuyan parçalar `<Suspense>` içinde istek anında akar.

- Ürün veya kategori değiştiren her işlem sonunda `revalidateTag(CATALOG_TAG, "max")` çağırın;
  yoksa değişiklik en geç bir dakika (kategorilerde bir saat) sonra görünür.
- Yeni bir sayfada `cookies()`, `searchParams` veya önbelleksiz veritabanı okuması varsa
  `<Suspense>` içine alınmalıdır; aksi halde build hata verir.
- `npm run dev` her sayfayı istek anında derlediği için yavaştır. Gerçek hızı görmek için
  `npm run build` ardından `npm run start` kullanın.

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
