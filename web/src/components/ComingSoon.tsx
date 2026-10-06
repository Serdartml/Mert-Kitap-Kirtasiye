import Link from "next/link";
import { User } from "lucide-react";

export default function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="container-page max-w-md py-20 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500">
        <User size={30} />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p>
      <Link href="/" className="btn btn-dark mt-6">Alışverişe Devam Et</Link>
    </div>
  );
}
