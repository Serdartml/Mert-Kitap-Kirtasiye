import { Suspense } from "react";
import type { Metadata } from "next";
import { Star, Trash2 } from "lucide-react";
import { deleteAddress, setDefaultAddress } from "@/actions/profile";
import AccountFrame from "@/components/AccountFrame";
import AddressForm from "@/components/AddressForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { PanelSkeleton } from "@/components/Skeletons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Adreslerim",
  robots: { index: false },
};

export default function AddressesPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <AddressesContent />
    </Suspense>
  );
}

async function AddressesContent() {
  const user = await requireUser("/hesabim/adresler");
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <AccountFrame user={user} active="adresler">
      <h2 className="text-lg font-extrabold">Adreslerim</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Şu an siparişler mağazadan teslim edildiği için adres gerekmez. Kayıtlı adresleriniz, adrese kargo seçeneği açıldığında
        sipariş sırasında kullanılabilir.
      </p>

      {addresses.length > 0 && (
        <ul className="mt-4 space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-xl border border-neutral-200 bg-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-extrabold">{address.title}</p>
                {address.isDefault && (
                  <span className="rounded-md bg-brand-500 px-2 py-0.5 text-xs font-extrabold text-ink">Varsayılan</span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold">{address.fullName} · {address.phone}</p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-neutral-600">
                {address.line}
                {"\n"}
                {address.postalCode ? `${address.postalCode} ` : ""}
                {address.district} / {address.city}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!address.isDefault && (
                  <form action={setDefaultAddress.bind(null, address.id)}>
                    <button type="submit" className="btn btn-outline min-h-11 py-2">
                      <Star size={16} aria-hidden /> Varsayılan yap
                    </button>
                  </form>
                )}
                <form action={deleteAddress.bind(null, address.id)}>
                  <ConfirmButton
                    message={`"${address.title}" adresi silinecek. Emin misiniz?`}
                    aria-label={`${address.title} adresini sil`}
                    className="btn btn-outline min-h-11 py-2 hover:border-red-700 hover:text-red-700"
                  >
                    <Trash2 size={16} aria-hidden /> Sil
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">{addresses.length === 0 ? "İlk adresinizi ekleyin" : "Yeni adres ekle"}</h2>
        <AddressForm isFirst={addresses.length === 0} />
      </section>
    </AccountFrame>
  );
}
