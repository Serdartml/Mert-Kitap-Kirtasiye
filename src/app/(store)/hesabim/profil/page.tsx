import { Suspense } from "react";
import type { Metadata } from "next";
import AccountFrame from "@/components/AccountFrame";
import { PasswordForm, ProfileForm } from "@/components/ProfileForms";
import { PanelSkeleton } from "@/components/Skeletons";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profilim",
  robots: { index: false },
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const user = await requireUser("/hesabim/profil");

  return (
    <AccountFrame user={user} active="profil">
      <section>
        <h2 className="mb-3 text-lg font-extrabold">Kişisel bilgiler</h2>
        <ProfileForm defaults={{ name: user.name ?? "", phone: user.phone ?? "", email: user.email }} />
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-8">
        <h2 className="mb-3 text-lg font-extrabold">Parola</h2>
        <PasswordForm />
      </section>
    </AccountFrame>
  );
}
