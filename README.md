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

## Yönetim paneli

Adres: `/yonetim` (giriş: `/yonetim/giris`). Bölümler: Özet, Siparişler (durum değiştirme; iptalde
stok geri verilir), Ürünler, Kategoriler, Müşteriler (üyeler, kayıt tarihine göre sıralı) ve Mesajlar
(iletişim formu). Katalogdaki değişiklik mağazaya hemen yansır.

Yönetici hesabı oluşturmak veya parolasını değiştirmek için:

```bash
npm run admin:create -- ornek@eposta.com
```

Parola sorulur (en az 10 karakter). Hesaplar veritabanında durur; her ortam (yerel, canlı) için
kendi veritabanında ayrıca oluşturulmalıdır.

Yeni bir yönetim sayfası veya action yazarken ilk satırda `await requireAdmin()` çağırın; layout'taki
kontrol tek başına yetmez.

Her yönetim sayfasında ve panel layout'unda `export const instant = false;` bulunur. Next, oturum çerezini okuyan her sayfayı
"anında gezinme" denetiminden geçirir ve bulamayınca geliştirme sunucusunda hata katmanı açar
("encountered uncached data during prerendering or a navigation"); telefonda bu katman sayfayı kapatır.
Panel zaten oturum arkasında olduğundan denetimden çıkarıldı. Yeni yönetim sayfasına da ekleyin.
Sayfalar arası geçişte `(panel)/loading.tsx` iskeleti görünür. Önbelleğe girmemesi gereken zaman
okumaları (`new Date()`, `Math.random()`) için render sırasında `await io()` (`next/cache`) çağırın;
`getCurrentUser` oturum süresini böyle kontrol eder.

## Ana sayfa ve arama

- Üst vitrinin altındaki kayan şerit `ShowcaseMarquee` / `Marquee`: kategoriler ve mağaza mesajları, bekleme
  olmadan akar; fare/odakla ve durdurma düğmesiyle durur. "Hareketi azalt" açıkken de oynar
  (`globals.css` içinde bilerek muaf; karşılama ekranıyla aynı karar).
- Rakam bandı değerleri `src/lib/site.ts` içindeki `stats`.
- Görseli olmayan ürünler `ProductVisual` içinde kategoriye göre renkli "kapak" gösterir (baş harf, ikon).
  Renkler `lib/category-icons.ts` içindeki `categoryTones`; yeni ana kategoriye buraya da ekleyin.
- Arama kutusu `SearchBox`, önerileri `/api/arama-oneri` verir (`getSearchSuggestions`, dakikalık önbellek;
  eşleşme kuralı `listProducts` ile aynı tutulmalı).

## Deneme sınırı

Giriş (müşteri ve yönetici), kayıt ve iletişim formu `src/lib/rate-limit.ts` ile sınırlıdır; sayaçlar
`RateLimit` tablosunda durur, sınır değerleri `LIMITS` içindedir. Giriş: e-posta başına 15 dakikada 8,
IP başına 30 deneme (başarılı girişte e-posta sayacı sıfırlanır). Yeni bir form action'ı yazarken
pahalı işten (parola özeti, kayıt) önce `checkLimits` çağırın.

## Yapı

```
prisma/schema.prisma      veri modeli
prisma/seed.ts            örnek katalog (gerçek ürün değil)
src/app/(store)/          vitrin sayfaları (header + footer'lı)
src/app/yonetim/          yönetim paneli
src/actions/              server action'lar (sepet, sipariş, üyelik, yönetim, iletişim formu)
src/components/           arayüz bileşenleri (admin/ altında panel bileşenleri)
src/lib/site.ts           mağaza bilgileri (adres, telefon, saatler, metinler)
src/lib/catalog.ts        ürün ve kategori sorguları (önbellekli)
src/lib/cart.ts           çerez tabanlı sepet; girişte üyeye bağlanır
src/lib/auth.ts           oturum (müşteri ve yönetici ortak), requireUser / requireAdmin
src/lib/orders.ts         sipariş numarası ve misafir sipariş takibi
src/lib/rate-limit.ts     deneme sınırı
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
| `/odeme` | Sipariş formu; tek yöntem mağazadan teslim, ödeme mağazada. Üyeliksiz de sipariş verilir |
| `/siparis/[orderNo]` | Sipariş özeti |
| `/giris`, `/kayit`, `/hesabim` | Müşteri üyeliği ve sipariş geçmişi |
| `/hakkimizda`, `/iletisim` | Hazır |
| `/bilgi/[slug]` | KVKK, gizlilik vb.; metinler yazılacak (şimdilik arama motorlarına kapalı) |

## Bilinen eksikler

- **Yasal metinler:** `/bilgi/*` sayfaları boş ("içerik hazırlanıyor"). Hukuki onaylı metin gerekiyor; yazılınca `index` açılmalı.
- **Ürün görselleri:** Yönetim panelinde görsel yükleme yok (Cloudflare R2 kararlaştırıldı, hesap bilgileri bekleniyor). Görseli olmayan ürünlerde kategori ikonlu yer tutucu çıkar. Şemada `ProductImage` hazır.
- **Toplu ürün aktarımı:** Dükkânın stok programından (Turna Yazılım, ~10 bin ürün) içe aktarma yok; örnek dışa aktarım bekleniyor. Anahtar alanlar: `barcode`, `sku`. Canlıya çıkmadan önce `db:seed` örnek kataloğu gerçek veriyle değiştirilmeli.
- **Online ödeme ve kargo:** Yok (iyzico / PayTR seçimi bekliyor). Şimdilik yalnızca mağazadan teslim. Stok sipariş anında düşülür; ödeme gelince onay anına alınmalı (`actions/order.ts`).
- **E-posta:** Gönderim servisi yok. Sipariş onayı, parola sıfırlama, e-posta doğrulama ve yeni mesaj/sipariş bildirimi bunu bekliyor.
- **Kullanılmayan tablolar:** `Address`, `Favorite`, `Review`, `Brand` şemada var ama arayüzü yok.
- **Logo:** `src/components/Logo.tsx` içinde satır içi SVG olarak tabeladan yeniden çizildi; renkler tahmini (`BLUE`, `PINK`, `YELLOW`). Resmî renk kodları gelince yalnızca bu sabitler değişir. `src/app/icon.svg` aynı işaretten.
- **Veritabanı:** Geliştirme ve canlı için tek Neon veritabanı var. Canlı için ayrı veritabanı açılıp `npm run db:deploy` ve `npm run admin:create` orada çalıştırılmalı.
- **Test:** Otomatik test yok.
