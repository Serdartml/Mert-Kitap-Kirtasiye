// Veri akarken gösterilen yer tutucular. Gerçek düzenle aynı ölçülerde tutulur ki içerik gelince sayfa zıplamasın.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 ${className}`} />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 p-2 sm:p-3">
          <Bar className="aspect-square w-full rounded-lg" />
          <Bar className="mt-3 h-3 w-1/3" />
          <Bar className="mt-2 h-4 w-4/5" />
          <Bar className="mt-4 h-5 w-1/2" />
          <Bar className="mt-3 h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div className="container-page py-6" role="status" aria-label="Ürünler yükleniyor">
      <Bar className="mb-5 h-3 w-40" />
      <div className="grid gap-5 lg:grid-cols-[14rem_1fr] lg:gap-8">
        <div className="flex gap-2 lg:flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <Bar key={i} className="h-9 w-24 lg:w-full" />
          ))}
        </div>
        <div className="min-w-0">
          <Bar className="h-8 w-48" />
          <Bar className="mb-5 mt-2 h-4 w-64 max-w-full" />
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container-page py-6" role="status" aria-label="Ürün yükleniyor">
      <Bar className="mb-5 h-3 w-56" />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <Bar className="aspect-square w-full rounded-lg" />
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
