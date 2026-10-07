import { gridClasses } from "./ProductGrid";

// Veri akarken gösterilen yer tutucular. Gerçek düzenle aynı ölçülerde tutulur ki içerik gelince sayfa zıplamasın.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 ${className}`} />;
}

// Kurşun kalemle çizilen kutu ve çizgi (globals.css, .sketch). Çerçeve bir SVG dikdörtgenidir ki
// kenarı baştan sona "çizilebilsin"; delay, parçaların sırayla çizilmesini sağlar.
function SketchBox({ className = "", delay = 0, rx = 12, children }: { className?: string; delay?: number; rx?: number; children?: React.ReactNode }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="sketch absolute inset-0 size-full" aria-hidden>
        <rect width="100%" height="100%" rx={rx} pathLength={1} style={{ animationDelay: `${delay}s` }} />
      </svg>
      {children}
    </div>
  );
}

function SketchLine({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg className={`sketch block ${className}`} aria-hidden>
      <line x1="1" y1="50%" x2="100%" y2="50%" pathLength={1} style={{ animationDelay: `${delay}s` }} />
    </svg>
  );
}

// Ölçüler ProductCard ile aynı: önce kartın çerçevesi, sonra görsel kutusu, yazı çizgileri ve buton çizilir.
export function ProductGridSkeleton({ count = 10, dense = false }: { count?: number; dense?: boolean }) {
  return (
    <div className={dense ? gridClasses.dense : gridClasses.default} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        // Kartlar da sırayla başlar; en fazla beş basamak, yoksa son kartlar çok geç kalır.
        const start = (i % 5) * 0.08;
        return (
          <SketchBox key={i} className="p-2 sm:p-3" delay={start}>
            <SketchBox className="aspect-square w-full" delay={start + 0.15} rx={8} />
            <SketchLine className="mt-3 h-4 w-1/3" delay={start + 0.35} />
            <SketchLine className="mt-1 h-5 w-4/5" delay={start + 0.45} />
            <SketchLine className="h-5 w-3/5" delay={start + 0.52} />
            <SketchLine className="mt-2 h-6 w-1/2 sm:h-7" delay={start + 0.6} />
            <SketchBox className="mt-3 h-10 w-full" delay={start + 0.7} rx={8} />
          </SketchBox>
        );
      })}
    </div>
  );
}

// Sıralama çubuğu + ürün ızgarası. Kategori sayfasında başlık şeridinin altında gösterilir.
export function ProductListSkeleton() {
  return (
    <div role="status" aria-label="Ürünler yükleniyor">
      <div className="mb-4 flex gap-2">
        <Bar className="h-8 w-16 sm:mr-auto" />
        {Array.from({ length: 3 }, (_, i) => (
          <Bar key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <ProductGridSkeleton dense />
    </div>
  );
}

// Raf görünümlü kategori (kültür kitapları) için: sıralama çubuğu + rafta sırayla çizilen kitap sırtları.
// Kart ızgarası yer tutucusu burada kullanılmaz; yoksa önce kartlar çizilip sonra raf gelir.
// Ölçüler BookShelf ile aynıdır (yükseklik 9-12rem, genişlik 2.5-3.4rem).
const shelfSpines = [10.5, 12, 9.75, 11.25, 9, 12, 10.5, 9.75];

export function ShelfListSkeleton() {
  return (
    <div role="status" aria-label="Kitaplar yükleniyor" data-shelf-skeleton>
      <div className="mb-4 flex gap-2">
        <Bar className="h-8 w-16 sm:mr-auto" />
        {Array.from({ length: 3 }, (_, i) => (
          <Bar key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {/* Tek satır: dar ekrana sığmayan sırtlar kırpılır, ikinci raf açılıp sayfayı uzatmaz. */}
      <div className="bookshelf flex items-end gap-x-1 overflow-hidden px-3 sm:gap-x-1.5 sm:px-10 lg:px-16" aria-hidden>
        {shelfSpines.map((height, i) => (
          <div key={i} className="flex h-[var(--shelf-row)] items-end pb-[10px]">
            <div style={{ height: `${height}rem`, width: `${2.5 + (i % 4) * 0.3}rem` }}>
              <SketchBox className="size-full" delay={i * 0.1} rx={3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Arama sayfası: başlık da veriyle birlikte geldiği için o da yer tutucu.
export function ListingSkeleton() {
  return (
    <div className="container-page py-6">
      <Bar className="mb-5 h-3 w-40" />
      <Bar className="mb-5 h-8 w-64 max-w-full" />
      <ProductListSkeleton />
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container-page py-6" role="status" aria-label="Ürün yükleniyor">
      <Bar className="mb-5 h-3 w-56" />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <SketchBox className="aspect-square w-full" rx={8} />
        <div>
          <Bar className="h-8 w-4/5" />
          <Bar className="mt-2 h-3 w-32" />
          <Bar className="mt-6 h-9 w-40" />
          <Bar className="mt-6 h-11 w-full max-w-md rounded-lg" />
          <Bar className="mt-6 h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="container-page py-8" role="status" aria-label="Yükleniyor">
      <Bar className="h-8 w-40" />
      <Bar className="mt-6 h-28 w-full rounded-xl" />
      <Bar className="mt-3 h-28 w-full rounded-xl" />
    </div>
  );
}
