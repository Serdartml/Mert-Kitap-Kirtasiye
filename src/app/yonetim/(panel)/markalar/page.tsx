import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Plus, Trash2 } from "lucide-react";
import { deleteBrand, setBrandsWholesaler } from "@/actions/admin";
import CheckAll from "@/components/admin/CheckAll";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusNote from "@/components/admin/StatusNote";
import { brandFilters, brandListWhere, brandOrderBy, brandSorts } from "@/lib/admin-brands";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Markalar" };

const PAGE_SIZE = 100;

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

interface PageProps {
  searchParams: Promise<{ q?: string; filtre?: string; sirala?: string; sayfa?: string; durum?: string; adet?: string }>;
}

export default async function AdminBrandsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const filter = brandFilters.some((item) => item.key === params.filtre) ? (params.filtre ?? "") : "";
  const sort = brandSorts.some((item) => item.key === params.sirala) ? (params.sirala ?? "ad") : "ad";
  const page = Math.max(1, Number.parseInt(params.sayfa ?? "1", 10) || 1);

  const where = brandListWhere({ q, filter });
  const [brands, total, wholesalerCount, brandCount] = await Promise.all([
    db.brand.findMany({
      where,
      orderBy: brandOrderBy(sort),
      include: { _count: { select: { products: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.brand.count({ where }),
    db.brand.count({ where: { isWholesaler: true } }),
    db.brand.count(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Toptancılar çok farklı türde ürün taşır; bu sayfadaki her markanın kaç kategoride ürünü olduğu ayırt etmeye yardım eder.
  const spread = brands.length
    ? await db.product.groupBy({ by: ["brandId", "categoryId"], where: { brandId: { in: brands.map((brand) => brand.id) } } })
    : [];
  const categoriesOf = new Map<string, number>();
  for (const row of spread) if (row.brandId) categoriesOf.set(row.brandId, (categoriesOf.get(row.brandId) ?? 0) + 1);

  const href = (overrides: Record<string, string | number>) => {
    const next = { q, filtre: filter, sirala: sort, sayfa: page, ...overrides };
    const query = new URLSearchParams();
    if (next.q) query.set("q", String(next.q));
    if (next.filtre) query.set("filtre", String(next.filtre));
    if (next.sirala && next.sirala !== "ad") query.set("sirala", String(next.sirala));
    if (Number(next.sayfa) > 1) query.set("sayfa", String(next.sayfa));
    const qs = query.toString();
    return qs ? `/yonetim/markalar?${qs}` : "/yonetim/markalar";
  };
  // Toplu işlem sonrası aynı listeye dönmek için formun taşıdığı süzgeçler.
  const back = href({}).split("?")[1] ?? "";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Markalar</span>
        </h1>
        <Link href="/yonetim/markalar/yeni" className="btn btn-primary">
          <Plus size={16} aria-hidden /> Yeni marka
        </Link>
      </div>

      <div className="mt-5">
        <StatusNote status={params.durum} count={params.adet} />
      </div>

      <p className="text-sm text-neutral-600">
        <span className="font-bold text-fg">{brandCount}</span> marka, bunların <span className="font-bold text-fg">{wholesalerCount}</span> tanesi toptancı olarak işaretli. Toptancı adları yalnızca burada
        görünür; ürün sayfasında ve marka filtresinde müşteriye gösterilmez.
      </p>

      <form action="/yonetim/markalar" className="mt-4 flex flex-wrap gap-2">
        {filter && <input type="hidden" name="filtre" value={filter} />}
        {sort !== "ad" && <input type="hidden" name="sirala" value={sort} />}
        <input name="q" type="search" defaultValue={q} placeholder="Marka adı" aria-label="Marka ara" className="field basis-full sm:max-w-xs sm:basis-auto" />
        <button type="submit" className="btn btn-dark">Ara</button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {brandFilters.map((item) => (
          <Link
            key={item.key}
            href={href({ filtre: item.key, sayfa: 1 })}
            aria-current={filter === item.key ? "true" : undefined}
            className={`flex min-h-10 items-center rounded-full border px-3.5 text-xs font-bold sm:min-h-8 sm:px-3 ${
              filter === item.key ? "border-brand-500 bg-brand-500 text-ink" : "border-neutral-300 hover:border-fg"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-neutral-300 sm:block" aria-hidden />
        {brandSorts.map((item) => (
          <Link
            key={item.key}
            href={href({ sirala: item.key, sayfa: 1 })}
            aria-current={sort === item.key ? "true" : undefined}
            className={`flex min-h-10 items-center rounded-full border px-3.5 text-xs font-bold sm:min-h-8 sm:px-3 ${
              sort === item.key ? "border-fg bg-fg text-bg" : "border-neutral-300 hover:border-fg"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        <span className="font-bold text-fg">{total}</span> marka listeleniyor
      </p>

      {brands.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          {q || filter ? "Bu seçime uygun marka yok." : "Henüz marka yok. Marka ekleyip ürünlerin düzenleme sayfasından seçtiğinizde kategori sayfalarında marka filtresi görünür."}
        </p>
      ) : (
        <form action={setBrandsWholesaler} className="mt-2">
          <input type="hidden" name="geri" value={back} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-raised px-3 py-2">
            <CheckAll label="Sayfadakileri seç" />
            <button type="submit" name="islem" value="toptanci" className="btn btn-dark ml-auto py-2">
              <EyeOff size={16} aria-hidden /> Seçilenleri toptancı yap
            </button>
            <button type="submit" name="islem" value="marka" className="btn btn-outline py-2">
              Seçilenleri marka yap
            </button>
          </div>

          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-raised">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-x-1 py-1.5 pl-3 pr-1.5 sm:gap-x-3 sm:px-4 sm:py-3">
                <input type="checkbox" name="ids" value={brand.id} aria-label={`Seç: ${brand.name}`} className="size-5 shrink-0 cursor-pointer accent-brand-500" />
                <Link href={`/yonetim/markalar/${brand.id}`} className="ml-2 min-w-0 flex-1 py-1.5 hover:underline">
                  <span className="block break-words font-extrabold">
                    {brand.name}
                    {brand.isWholesaler && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 align-middle text-[11px] font-bold text-brand-500">
                        <EyeOff size={11} aria-hidden /> Toptancı
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-neutral-500">?marka={brand.slug}</span>
                </Link>
                <span className="shrink-0 whitespace-nowrap px-2 text-right text-xs font-bold text-neutral-600">
                  {brand._count.products} ürün
                  <span className="block font-normal text-neutral-500">{categoriesOf.get(brand.id) ?? 0} kategoride</span>
                </span>
                <Link href={`/yonetim/markalar/${brand.id}`} className="grid min-h-10 shrink-0 place-items-center px-2 text-sm font-bold hover:underline">
                  Düzenle
                </Link>
                {brand._count.products === 0 ? (
                  <ConfirmButton
                    formAction={deleteBrand.bind(null, brand.id)}
                    message={`"${brand.name}" markası silinecek. Emin misiniz?`}
                    aria-label={`${brand.name} markasını sil`}
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-red-700"
                  >
                    <Trash2 size={16} aria-hidden />
                  </ConfirmButton>
                ) : (
                  <span className="size-10 shrink-0" title="Ürünleri olduğu için silinemez" />
                )}
              </li>
            ))}
          </ul>
        </form>
      )}

      {pageCount > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-center gap-3 text-sm font-bold">
          {page > 1 ? <Link href={href({ sayfa: page - 1 })} className="btn btn-outline py-2.5">← Önceki</Link> : null}
          <span className="text-neutral-600">
            {page} / {pageCount}
          </span>
          {page < pageCount ? <Link href={href({ sayfa: page + 1 })} className="btn btn-outline py-2.5">Sonraki →</Link> : null}
        </nav>
      )}
    </>
  );
}
