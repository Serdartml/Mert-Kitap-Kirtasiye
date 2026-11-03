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

**Excel'den ürün aktarma** (`/yonetim/urunler/ice-aktar`): stok programından alınan `.xlsx` dosyası yüklenir (`.xls` ve CSV
desteklenmez), sütunlar başlıklardan otomatik eşlenir (elle değiştirilebilir; Turna'nın gerçek başlıkları örnek dosya
gelince `lib/product-import.ts` içindeki `ALIASES`'e eklenir), önizleme ne ekleneceğini/güncelleneceğini/atlanacağını
gösterir, onaylanınca tek işlemde yazılır (hata olursa hiçbir şey değişmez). İki mod: *yalnızca stok ve fiyat* (yeni ürün
eklenmez; günlük güncelleme için) ve *ürünleri içe aktar* (yeni ürün ekler; ad, kategori, marka, açıklama da güncellenir).
Eşleştirme stok koduna (`sku`), yoksa barkoda göre yapılır. Görseller, "öne çıkan" işareti ve ürün adresi (slug) korunur.
"Açık siparişlerin ayırdığı stoğu düş" (varsayılan açık): sipariş verilince stok sitede hemen düşer ama Turna'da ürün
teslim edilince düşer; açık siparişlerin (`PENDING/PAID/PREPARING/SHIPPED`) adedi yazılan stoktan çıkarılır, yoksa her aktarım
ayrılmış ürünleri yeniden satışa açardı. Fiyatlar KDV hariçse oran seçilir. Dosya en fazla 4 MB (Vercel istek sınırı 4,5 MB;
`next.config.ts` içindeki `serverActions.bodySizeLimit`). Mantık `lib/product-import.ts` (saf, testli), veritabanı
işlemleri `actions/product-import.ts` içindedir; güncellemeler yüzlerce satırlık tek SQL ile yapılır.

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
  mağaza bandı, footer. Sayfa normal kaydırılır (fare tekeri duraklı kaydırma denendi ve güvenilir çalışmadığı için kaldırıldı).
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
- Varsayılan tema AÇIKTIR (`lib/theme.ts`, `app/layout.tsx`): html sınıfsız başlar; ziyaretçi düğmeyle "koyu"
  seçip kaydettiyse (localStorage `theme=dark`) koyu açılır. Varsayılanı değiştirmek için bu iki dosyaya bakın.
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

## Canlı yayın (Hetzner + Docker)

Site tek bir Hetzner sunucusunda Docker ile çalışır. Sunucu veri tutmaz: veritabanı Neon'da, görseller R2'de. Sunucu bozulursa
yenisi kurulup iş akışı yeniden çalıştırılır. Parçalar:

| Dosya | Görevi |
| --- | --- |
| `Dockerfile` | `next build` (standalone) ve çalışan imaj. Canlı `.env` derlemeye *secret* olarak girer, imaja yazılmaz |
| `.github/workflows/yayin.yml` | main'e push'ta: test, `prisma migrate deploy`, imajı derle → GHCR, sunucuya yayınla, siteyi yokla |
| `deploy/compose.yml` | Sunucuda `app` (Next, yalnızca 127.0.0.1:3000) + `caddy` (80/443, otomatik HTTPS) |
| `deploy/Caddyfile` | HTTPS, www → çıplak alan adı yönlendirmesi, gerçek istemci IP'si (`X-Real-IP`, Cloudflare destekli) |
| `deploy/sunucu-kurulum.sh` | Yeni sunucuyu bir kez hazırlar: Docker, güvenlik duvarı, yalnızca anahtarla SSH, otomatik güvenlik güncellemeleri, `deploy` kullanıcısı, günlük temizlik cron'u |

Derleme sunucuda değil GitHub Actions'ta yapılır (10 bin ürünlük derleme 4 GB'lık sunucuyu zorlar). Migration'lar
her yayında otomatik uygulanır (yalnızca depoya girmiş `prisma/migrations`).

### İlk kurulum (bir kez)

1. **Alan adı:** .com.tr alan adını bir Türk kayıt firmasından alın. Kayıt firmasının panelinde ad sunucularını (nameserver)
   Cloudflare'in verdiği iki adresle değiştirin (Cloudflare ücretsiz plan > *Add a domain*). DNS artık Cloudflare'den yönetilir.
2. **Sunucu:** Hetzner Cloud > yeni proje > *Add Server*: konum Nürnberg ya da Falkenstein (Neon Frankfurt'a yakın), Ubuntu 24.04,
   4 GB RAM'li en küçük paylaşımlı x86 plan, kendi bilgisayarınızın SSH anahtarı. *Firewalls* ile 22, 80, 443 (TCP) ve 443 (UDP)
   açık bir güvenlik duvarı ekleyin.
3. **Yayın anahtarı** (GitHub Actions'ın sunucuya bağlanacağı anahtar; kendi bilgisayarınızda):
   `ssh-keygen -t ed25519 -f yayin-anahtari -C github-actions-yayin -N '""'` (PowerShell). `yayin-anahtari.pub` açık kısım,
   `yayin-anahtari` gizli kısım. Gizli kısmı GitHub'a girdikten sonra bilgisayardan silin.
4. **Sunucuyu hazırlayın:** `ssh root@SUNUCU_IP`, `deploy/sunucu-kurulum.sh` içeriğini sunucuda `kurulum.sh` olarak kaydedin ve
   `bash kurulum.sh "<yayin-anahtari.pub içeriği>"` çalıştırın.
5. **DNS kayıtları** (Cloudflare > DNS): `A @ SUNUCU_IP` ve `A www SUNUCU_IP`, ikisi de **DNS only (gri bulut)**. Caddy
   sertifikayı ilk yayında kendisi alır. İsterseniz sonra turuncu buluta (proxy) geçin; o zaman SSL/TLS modu **Full (strict)** olmalı.
6. **E-posta (Resend):** resend.com'da alan adını ekleyin, verdiği DNS kayıtlarını Cloudflare'e girin, API anahtarı oluşturun.
   Gelen kutusu için Cloudflare > Email > *Email Routing* ile `info@alanadi` adresini mevcut e-postaya yönlendirebilirsiniz.
7. **GitHub** (depo > Settings > Secrets and variables > Actions):
   - Secret `ENV_FILE`: canlı `.env`'in tamamı (aşağıdaki örnek). Boşluk içeren değerleri çift tırnağa alın, değerlerde `$` kullanmayın.
   - Secret `SSH_HOST`: sunucunun IP'si. Secret `SSH_PRIVATE_KEY`: `yayin-anahtari` dosyasının içeriği.
   - Variable `SITE_DOMAIN`: örn. `mertkitap.com.tr`. Variable `DEPLOY_ENABLED`: `true` (tanımlı değilse iş akışı hiç çalışmaz).
8. **İlk yayın:** Actions > *Yayın* > *Run workflow*. Sonraki yayınlar main'e her push'ta kendiliğinden çalışır.
9. Vercel projesinin bağlantısını kaldırın (Vercel > Project > Settings > Git > Disconnect); `vercel.json` artık kullanılmaz.

`ENV_FILE` örneği:

```
DATABASE_URL="postgresql://...-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://....eu-central-1.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_SITE_URL="https://mertkitap.com.tr"
# SITE_INDEXABLE=1   (yasal metinler onaylanıp satışa açılınca)
CRON_SECRET="uzun-rastgele-deger"
RESEND_API_KEY="re_..."
MAIL_FROM="Mert Kitap <siparis@mertkitap.com.tr>"
ADMIN_NOTIFY_EMAIL="..."
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="..."
```

Veritabanı: ürün verisi şu an tek Neon veritabanında. Bu veritabanı **canlı** olarak kalsın; geliştirme için Neon'da bir *branch*
açıp yerel `.env`'i ona çevirin, böylece denemeler canlı siparişlere karışmaz. Yönetici hesabı veritabanında durduğu için yeniden oluşturmak gerekmez.

### Günlük işler

- Sunucuda durum: `ssh deploy@SUNUCU_IP`, `cd /opt/mertkitap`, `docker compose --env-file .deploy ps` / `logs -f app`.
- Ortam değişkeni değişince: GitHub'da `ENV_FILE`'ı güncelleyip *Run workflow* (değerlerin bir kısmı derlemeye gömülüdür).
- Geri alma: Actions'ta eski bir başarılı çalışmayı *Re-run* edin (o commit'in imajı yeniden yayınlanır).
- Sunucu güncellemeleri kendiliğinden kurulur; çekirdek güncellemesinden sonra arada bir `sudo reboot` gerekir
  (konteynerler kendiliğinden geri gelir).

### Satışa açılış kontrol listesi

1. Ticari bilgiler `src/lib/legal-content.ts` → `legalOwner` (unvan, sahibi, vergi dairesi/no, MERSİS ya da sicil no).
2. `npm run yasal:cikti` ile avukata giden PDF'i alın (`yasal-inceleme/`), düzeltmeleri `legal-content.ts`'e işleyin,
   onaydan sonra `legalReviewed = true` yapın (eksik bilgi kalırsa `npm test` kırılır).
3. ETBİS kaydı (e-Devlet, Ticaret Bakanlığı Elektronik Ticaret Bilgi Sistemi): alan adıyla kayıt; verilen doğrulama
   karekodu/bağlantısı altbilgiye eklenecek.
4. `ENV_FILE`'a `SITE_INDEXABLE=1`, yeniden yayın; Google Search Console'a alan adını ve `/sitemap.xml`'i ekleyin.

## Hesabım

`/hesabim` dört bölümdür (`AccountFrame`): Siparişlerim ("Tekrar sipariş ver" eski siparişin ürünlerini sepete
ekler; stokta olmayanlar atlanır), Favorilerim (ürün sayfasındaki kalp), Adreslerim (en fazla 10; kargo açılınca
sipariş sırasında kullanılacak) ve Profil (ad, telefon, parola; parola değişince diğer cihazlardaki oturumlar kapanır,
deneme sayısı sınırlıdır). İşlemler `src/actions/profile.ts` içinde; her action oturumu kendisi doğrular.

Yönetim paneli özetinde son 14 günün sipariş sayısı ve ciro grafiği ile son 30 günün en çok satanları vardır
(`DailyBars`, `getDailyOrderStats`, `getTopSoldProducts`); iptal ve iade edilen siparişler sayılmaz.

## E-posta doğrulama

Kayıtta doğrulama bağlantısı gönderilir (`lib/email-verification.ts`, 24 saat geçerli, tek kullanımlık; veritabanında yalnızca
token özeti). Bağlantı `/eposta-dogrula` sayfasını açar ve bir "Doğrula" düğmesiyle onaylanır: e-posta servisleri bağlantıları
kendiliğinden açabildiği için doğrulama yalnızca GET ile yapılmaz. Doğrulama giriş ya da sipariş vermeyi **engellemez**;
doğrulanmamış üyeye `/hesabim` sayfalarında hatırlatma ve "yeniden gönder" (saatte 3) çıkar. Kayıt öncesi üyelerin
`emailVerifiedAt` değeri boştur, onlara da hatırlatma çıkar. Üye e-postasını değiştiremediği için yeniden doğrulama akışı yoktur.

## Günlük temizlik

Sunucudaki cron (`/etc/cron.d/mertkitap`, `deploy/sunucu-kurulum.sh` kurar) her gün 03:00'te (UTC) `/api/cron/temizlik`
adresini çağırır (`lib/cleanup.ts`): süresi dolmuş oturumlar, deneme sınırı sayaçları, kullanılmış/süresi dolmuş parola sıfırlama
ve e-posta doğrulama kayıtları silinir. Uç nokta `CRON_SECRET` ortam değişkeni olmadan kapalıdır (401); betik değeri sunucudaki
`/opt/mertkitap/.env`'den okuyup `Authorization: Bearer` başlığıyla gönderir. Günlük: `/var/log/mertkitap-temizlik.log`. Yerelde: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/temizlik`.

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

- **Yasal metinler:** `/bilgi/*` yedi metin `src/lib/legal-content.ts` içinde (KVKK, gizlilik, çerez, ön bilgilendirme, mesafeli satış, iade, üyelik; mağazadan teslim, ödeme mağazada akışına göre). Eksik ticari bilgiler metinde `[DOLDURULACAK: ...]` olarak görünür, altbilgide yalnızca dolu olanlar çıkar. Siparişte ön bilgilendirme + sözleşme, kayıtta üyelik sözleşmesi onay kutusu zorunludur (sunucu da kontrol eder); sipariş onayı e-postası iki metnin tam halini alıcı ve sipariş bilgileriyle gönderir. Avukat çıktısı ve inceleme soruları: `npm run yasal:cikti`. Hukuki onaya kadar `legalReviewed = false` (taslak uyarısı, `noindex`). Altyapı sağlayıcısı eklenince `dataProcessors`, yeni çerez eklenince çerez politikası güncellenmeli. Online ödeme/kargo gelince sözleşme, ön bilgilendirme ve iade metinleri güncellenmeli.
- **Ürün görselleri (Cloudflare R2):** Yönetim > Ürünü düzenle sayfasında "Görseller" bölümünden yüklenir (en fazla 8, ilk görsel kapak; tarayıcı 1600 px WebP'ye küçültür, sunucu eylemi `uploadProductImages` R2'ye yazar, adres `ProductImage`'a kaydedilir). Bağlamak için `.env` ve Vercel ortam değişkenleri: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (bkz. `.env.example`); değişince yeniden dağıtım gerekir. Dördü de yoksa yükleme kapalıdır ve sayfa bunu söyler. Görseller sitenin kendi `/gorsel/...` adresinden sunulur (r2.dev adresleri bazı ağlarda açılmıyor); kovaya kendi alan adınızı bağlarsanız `R2_PUBLIC_URL` ile doğrudan oradan da verilebilir. Görseli olmayan ürünlerde kategori ikonlu yer tutucu çıkar.
- **Toplu ürün aktarımı:** Excel (.xlsx) ile içe aktarma hazır (yukarıda, Yönetim paneli). Turna'nın gerçek sütun adları ve fiyatın KDV durumu örnek dışa aktarım gelince netleşecek (sütunlar arayüzden elle de eşlenebilir). Düzenli otomatik stok eşitleme yok: dükkândaki bilgisayardan siteye gönderen bir yol Turna'nın API'sine/otomatik dışa aktarımına bağlı; şimdilik günlük elle yükleme. Canlıya çıkmadan önce `db:seed` örnek kataloğu gerçek veriyle değiştirilmeli.
- **Online ödeme ve kargo:** Yok (iyzico / PayTR seçimi bekliyor). Şimdilik yalnızca mağazadan teslim. Stok sipariş anında düşülür; ödeme gelince onay anına alınmalı (`actions/order.ts`).
- **E-posta:** `lib/mail.ts` (Resend) ve `lib/mail-templates.ts` hazır: sipariş onayı, durum değişikliği (müşteriye), yeni sipariş / yeni mesaj (mağazaya) ve parola sıfırlama (`/sifremi-unuttum`). `RESEND_API_KEY` yokken gönderilmez, konsola yazılır. Gerçek gönderim için Resend hesabı + doğrulanmış alan adı gerekir (`.env.example`). E-posta doğrulama (kayıtta) hazır, bkz. "E-posta doğrulama".
- **Yorumlar ve markalar:** Hazır. Üyeler ürün sayfasındaki "Yorumlar" sekmesinden puan + yorum yazar (üye başına ürün başına tek yorum, saatte 5 sınırı); yorum `/yonetim/yorumlar`dan onaylanana kadar görünmez, ortalama puan ürün sayfasında ve JSON-LD'de çıkar. Markalar `/yonetim/markalar`da yönetilir, ürün formundan seçilir (kategori sayfasındaki marka filtresi bunu kullanır). Ürün kartlarında puan yok. Yorumu yalnızca satın alanlarla sınırlamak istenirse `actions/reviews.ts` içinde sipariş kontrolü eklenmeli.
- **Logo:** `src/components/Logo.tsx` içinde satır içi SVG olarak tabeladan yeniden çizildi; renkler tahmini (`BLUE`, `PINK`, `YELLOW`). Resmî renk kodları gelince yalnızca bu sabitler değişir. `src/app/icon.svg` aynı işaretten. Sitenin sarısı artık logonun limon sarısıdır (`#e9e61c`, `globals.css` içindeki `--color-brand-*` ölçeği; `Logo.tsx`'teki `YELLOW` ile aynı). Logo sarısı değişirse `--color-brand-*`, `CategoryArt`, e-posta şablonları ve `category-icons.ts` içindeki sabitler de güncellenmeli. Ürün renk paletindeki "Sarı" (`lib/colors.ts`) ürünün gerçek rengidir, marka rengi değildir.
- **Veritabanı:** Geliştirme ve canlı için tek Neon veritabanı var. Canlı için ayrı veritabanı açılıp `npm run db:deploy` ve `npm run admin:create` orada çalıştırılmalı.
- **Test:** `npm test` (Vitest, `tests/`): slug/fiyat, parola, sipariş numarası ve durumları, e-posta, yasal metinler, toplu sepet ekleme. Testler veritabanına bağlanmaz (db `vi.mock` ile değiştirilir); sipariş/stok işlemleri ve sayfalar için uçtan uca test yok.

