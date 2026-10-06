import Link from "next/link";
import CategoryArt from "./CategoryArt";

interface EmptyStateProps {
  title: string;
  text: string;
  rootSlug?: string;
  action?: { href: string; label: string };
}

// Boş liste ekranı: sarı daire içinde kategorinin çizimi.
export default function EmptyState({ title, text, rootSlug = "kirtasiye", action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center">
      <span className="theme-fixed mx-auto grid size-28 place-items-center rounded-full bg-brand-500">
        <CategoryArt rootSlug={rootSlug} className="w-20" />
      </span>
      <h2 className="mt-5 text-lg font-extrabold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600">{text}</p>
      {action && (
        <Link href={action.href} className="btn btn-dark mt-5">
          {action.label}
        </Link>
      )}
    </div>
  );
}
