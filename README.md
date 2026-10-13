# Mert Kitap Kırtasiye - E-ticaret

Next.js (App Router) + TypeScript + Tailwind CSS v4 + Prisma.

## Kurulum

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env; sonra Neon adreslerini yazın
npm run db:deploy         # mevcut migration'ları veritabanına uygular
npm run db:seed           # ÖRNEK kategori ve ürünleri yükler (üretilmiş 108 ürün dahil)
npm run db:seed-more      # yalnızca üretilmiş örnek ürünleri ekler (her ana kategoriye 18; var olana dokunmaz)
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

- Üst vitrin `LiveShowcase` + `ShowcaseCard`: limon sarısı bant, el yazısı "Öne Çıkanlar" başlığı, el yazısı kategori düğmeleri ve koyu,
  çerçeveli lüks kartlar. Seçili kategorinin öne çıkanları görünür (`getFeaturedByRoot`; açılışta Kültür Kitapları, kart biçiminde; öne çıkanı olmayan
  kategori gizlenir, hiç öne çıkan yoksa vitrin gizlenir). 768 px ve üstünde üç kart görünür ve üçer üçer kayar; daha dar ekranlarda tek kart görünür
  ve birer birer kayar. Kayma yumuşaktır (1,1 sn ease-in-out, `SLIDE_MS`), kartlar arası bekleme 2,2 sn (`HOLD_MS`); sona gelince başa sarar. Fare/klavye
  odağı, dokunma, ekran dışı, sekme arka planda, "Durdur" düğmesi ve "hareketi azalt" durumunda kendiliğinden kayma durur. Eski 4 sahneli çizimli vitrin
  (`HeroShowcase`, `HeroArt`) kaldırıldı; git geçmişinde.
- Ana sayfa bölüm sırası: vitrin, kategori şeridi, rakam bandı, ürünler (indirimli, yeni gelenler), okula dönüş listeleri, nasıl sipariş verilir, sipariş takip,
  mağaza bandı, footer. Masaüstünde fare tekeriyle duraklı kaydırma (`HomeSnapScroll`): vitrin ortada → ürünler başı → (ürünlerde normal kaydırma) → ürünler sonu
  → mağaza bandı → footer; tek tekerlek hareketi bir durak. Duraklar `page.tsx`'teki `data-snap` işaretlerinden ölçülür (`vitrin`, `serbest-son`, `alt-blok`);
  bölümleri taşırken bu işaretleri de taşıyın. Dokunmatik/dar ekran, açık pencere ve kendi kayan alanı olan öğelerde devre dışıdır.
- Kategori renkleri: her ana kategorinin bir rengi vardır (kırtasiye limon, sanatsal pembe, hazırlık kitapları mavi, kültür kitapları turuncu, hediyelik mor, elektronik nane). Kategori ve ürün sayfaları, vitrin bandı ve kayan kategori kartları `data-cat=<ana kategori adresi>` ile işaretlenir; `globals.css` içindeki "Kategori renkleri" bölümü marka sarısı ölçeğini (`--color-brand-*`) o renge çevirir, `bg-brand-500` / `btn-primary` / `CategoryArt` kendiliğinden uyar. Yeni ana kategori için o bölüme blok, `category-icons.ts`'e kapak rengi eklenir; bilinmeyen kategori limonda kalır.
- Kayan şerit (`ShowcaseMarquee` + `Marquee`): üç sıra; üst ve alt soldan sağa, orta sağdan sola kayar. Dokunulan / fare üstündeki / odaktaki satır durur, bırakılınca devam eder, diğer satırlar kayar. Kategori kartları kendi kategori renginde ve üç görünümdedir (dolu, siyah, açık).
- Rakam bandı değerleri `src/lib/site.ts` içindeki `stats`.
- Görseli olmayan ürünler `ProductVisual` içinde kategoriye göre renkli "kapak" gösterir (baş harf, ikon).
  Renkler `lib/category-icons.ts` içindeki `categoryTones`; yeni ana kategoriye buraya da ekleyin.
- Arama kutusu `SearchBox`, önerileri `/api/arama-oneri` verir (`getSearchSuggestions`, dakikalık önbellek;
  eşleşme kuralı `listProducts` ile aynı tutulmalı).
- Ürün kartı (`ProductCard`): rozetler "Yeni" (son 14 gün; toplu içe aktarmada hepsi yeni olacağından, yeni
  ürünler katalogun %20'sinden ya da 30'dan fazlaysa kapanır: `getNewProductCutoff`), "Son N adet" (stok 5 ve
  altı: `LOW_STOCK_THRESHOLD`) ve "Tükendi".
- Hızlı bakış (`QuickViewArea` + `QuickViewHost`, özet `/api/urun-ozet`): bağımsız pencere değil, kartın yanında karttan büyüyen balon (kartın kopyası bulanık arka planın üstünde kalır; dar ekranda ortada açılır). Mobilde karta uzun basınca, masaüstünde
  fareyle 1 sn bekleyince açılır; düğme yoktur. Sürelerin sabitleri `QuickViewArea.tsx` başında.
- Sepete eklenince `CartToast` bildirimi çıkar ve sepet ikonu sallanır; `AddToCartButton` olayı yayınlar.
- Kategori sayfasında filtre çekmecesi (`FilterDrawer`): fiyat aralığı ve marka; markalı ürün yoksa yalnızca
  fiyat gösterilir. Adres parametreleri: `min`, `max`, `marka`.
- Ürün sayfası: sekmeler (`ProductTabs`), "Yanına yakışanlar" (önce birlikte alınanlar, sonra ana kategorinin
  diğer alt kategorileri: `getComplementaryProducts`), "WhatsApp'tan sor" düğmesi.
- Mağaza bandı: canlı açık/kapalı durumu (`OpenStatus`, `site.hours` içindeki `dayNumbers/open/close`ten
  hesaplanır) ve yırtık kâğıt kenarlar (`SectionEdge`).
- Varsayılan tema KOYUDUR (`lib/theme.ts`, `app/layout.tsx`): html `dark` sınıfıyla başlar; ziyaretçi düğmeyle "açık"
  seçip kaydettiyse (localStorage `theme=light`) açık açılır. Varsayılanı değiştirmek için bu iki dosyaya bakın.
- Mobilde yatay kayan ürün şeridi: `ProductGrid` içinde `scrollOnMobile`.
- Okula dönüş listeleri (`/okul-listeleri`, `/okul-listeleri/[slug]`): satırlar `src/lib/school-lists.ts` içinde
  (kategori + isteğe bağlı anahtar kelime + önerilen adet); ürünler katalogdan stoktakilerden seçtirilir
  (`getSchoolListOptions`), seçilenler `addManyToCart` ile tek seferde sepete eklenir. Listeler örnektir.
- "Nasıl sipariş verilir" şeridi (`HowItWorks`) ve altbilgideki teslimat bilgisi gerçek sipariş akışını anlatır
  (mağazadan teslim, ödeme mağazada); kargo / online ödeme gelince ikisi de güncellenmeli.
- `ScrollTop`: sayfa üstünde okuma ilerleme çubuğu ve "yukarı çık" düğmesi. `template.tsx`: sayfa geçişlerinde
  kısa çapraz solma (View Transitions; "hareketi azalt"ta kapanır).

## Sipariş takibi (üyeliksiz)

`/siparis-takip` (üst şerit, mobil menü, altbilgi ve ana sayfadaki şeritten): sipariş numarasıyla yalnızca DURUM görülür
(`lib/order-tracking.ts`). Kişisel bilgi ve ürünler gösterilmez; onlar için siparişi veren tarayıcı ya da üye oturumu
gerekir (`getOrderForViewer`). Numara tahmin edilemez (tarih + 6 rastgele karakter) ve sorgu IP başına 15 dakikada 20 ile
sınırlıdır. Numara küçük harf, boşluk ya da tiresiz yazılabilir.

## Deneme yayını (Vercel)

Vercel Hobby planı ticari kullanıma kapalıdır ("ürün satışını duyurmak" ve "ödeme istemek" ticari sayılır); gerçek müşteriyle
satışa çıkarken Pro gerekir. Hobby yalnızca **özel deneme** içindir: gerçek müşteri ve reklam yok, arama motorlarına kapalı,
mümkünse Vercel Authentication açık (Project Settings > Deployment Protection). Kurulum:

1. Vercel'de GitHub deposunu içe aktarın (framework Next.js, kök dizin). Tek proje hem mağazayı hem `/yonetim`'i yayınlar.
2. Ortam değişkenleri (Production ve Preview): `DATABASE_URL` (havuzlu), `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_SITE_URL`
   (yayın adresi; değişince yeniden yayınlanmalı). `SITE_INDEXABLE` deneme yayınında TANIMLANMAZ: robots.txt her şeyi yasaklar,
   sitemap boş olur, sayfalara `noindex` eklenir (`lib/indexing.ts`).
3. Veritabanı: deneme için AYRI bir Neon veritabanı ya da branch kullanın (geliştirme verisiyle karışmasın). Migration yayın
   sırasında çalışmaz: `DATABASE_URL_UNPOOLED` o veritabanına ayarlıyken yerelde `npm run db:deploy`, sonra `npm run admin:create -- eposta`
   (ve istenirse `npm run db:seed`) çalıştırın.
4. `vercel.json` bölgeyi `fra1` yapar (Neon eu-central-1 ile aynı bölge).
5. Gerçek yayında: Pro plana geçin, özel alan adı bağlayın, `NEXT_PUBLIC_SITE_URL` ve `SITE_INDEXABLE=1` verin, canlı için
   ayrı veritabanında yönetici hesabını yeniden oluşturun.

## Hesabım

`/hesabim` dört bölümdür (`AccountFrame`): Siparişlerim ("Tekrar sipariş ver" eski siparişin ürünlerini sepete
ekler; stokta olmayanlar atlanır), Favorilerim (ürün sayfasındaki kalp), Adreslerim (en fazla 10; kargo açılınca
sipariş sırasında kullanılacak) ve Profil (ad, telefon, parola; parola değişince diğer cihazlardaki oturumlar kapanır,
deneme sayısı sınırlıdır). İşlemler `src/actions/profile.ts` içinde; her action oturumu kendisi doğrular.

Yönetim paneli özetinde son 14 günün sipariş sayısı ve ciro grafiği ile son 30 günün en çok satanları vardır
(`DailyBars`, `getDailyOrderStats`, `getTopSoldProducts`); iptal ve iade edilen siparişler sayılmaz.

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

- **Yasal metinler:** `/bilgi/*` taslakları `src/lib/legal-content.ts` içinde yazıldı (mağazadan teslim, ödeme mağazada akışına göre). Hukuki onay gelene kadar `legalReviewed = false`: sayfada "taslak" uyarısı var ve `noindex`. Onaydan sonra `legalOwner` (unvan, vergi dairesi/no, MERSİS) doldurulup `legalReviewed = true` yapılmalı. Online ödeme/kargo gelince sözleşme ve iade metinleri güncellenmeli.
- **Ürün görselleri:** Yönetim panelinde görsel yükleme yok (Cloudflare R2 kararlaştırıldı, hesap bilgileri bekleniyor). Görseli olmayan ürünlerde kategori ikonlu yer tutucu çıkar. Şemada `ProductImage` hazır.
- **Toplu ürün aktarımı:** Dükkânın stok programından (Turna Yazılım, ~10 bin ürün) içe aktarma yok; örnek dışa aktarım bekleniyor. Anahtar alanlar: `barcode`, `sku`. Canlıya çıkmadan önce `db:seed` örnek kataloğu gerçek veriyle değiştirilmeli.
- **Online ödeme ve kargo:** Yok (iyzico / PayTR seçimi bekliyor). Şimdilik yalnızca mağazadan teslim. Stok sipariş anında düşülür; ödeme gelince onay anına alınmalı (`actions/order.ts`).
- **E-posta:** `lib/mail.ts` (Resend) ve `lib/mail-templates.ts` hazır: sipariş onayı, durum değişikliği (müşteriye), yeni sipariş / yeni mesaj (mağazaya) ve parola sıfırlama (`/sifremi-unuttum`). `RESEND_API_KEY` yokken gönderilmez, konsola yazılır. Gerçek gönderim için Resend hesabı + doğrulanmış alan adı gerekir (`.env.example`). E-posta doğrulama (kayıtta) henüz yok.
- **Yorumlar ve markalar:** Hazır. Üyeler ürün sayfasındaki "Yorumlar" sekmesinden puan + yorum yazar (üye başına ürün başına tek yorum, saatte 5 sınırı); yorum `/yonetim/yorumlar`dan onaylanana kadar görünmez, ortalama puan ürün sayfasında ve JSON-LD'de çıkar. Markalar `/yonetim/markalar`da yönetilir, ürün formundan seçilir (kategori sayfasındaki marka filtresi bunu kullanır). Ürün kartlarında puan yok. Yorumu yalnızca satın alanlarla sınırlamak istenirse `actions/reviews.ts` içinde sipariş kontrolü eklenmeli.
- **Logo:** `src/components/Logo.tsx` içinde satır içi SVG olarak tabeladan yeniden çizildi; renkler tahmini (`BLUE`, `PINK`, `YELLOW`). Resmî renk kodları gelince yalnızca bu sabitler değişir. `src/app/icon.svg` aynı işaretten. Sitenin sarısı artık logonun limon sarısıdır (`#e9e61c`, `globals.css` içindeki `--color-brand-*` ölçeği; `Logo.tsx`'teki `YELLOW` ile aynı). Logo sarısı değişirse `--color-brand-*`, `CategoryArt`, e-posta şablonları ve `category-icons.ts` içindeki sabitler de güncellenmeli. Ürün renk paletindeki "Sarı" (`lib/colors.ts`) ürünün gerçek rengidir, marka rengi değildir.
- **Veritabanı:** Geliştirme ve canlı için tek Neon veritabanı var. Canlı için ayrı veritabanı açılıp `npm run db:deploy` ve `npm run admin:create` orada çalıştırılmalı.
- **Test:** `npm test` (Vitest, `tests/`): slug/fiyat, parola, sipariş numarası ve durumları, e-posta, yasal metinler, toplu sepet ekleme. Testler veritabanına bağlanmaz (db `vi.mock` ile değiştirilir); sipariş/stok işlemleri ve sayfalar için uçtan uca test yok.
