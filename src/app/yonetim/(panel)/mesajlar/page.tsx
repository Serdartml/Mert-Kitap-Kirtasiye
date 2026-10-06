import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { deleteMessage } from "@/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusNote from "@/components/admin/StatusNote";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Mesajlar" };

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireAdmin();
  const { durum } = await searchParams;

  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <>
      <h1 className="text-2xl font-extrabold">
        <span className="marker">Mesajlar</span>
      </h1>
      <p className="mt-2 text-sm text-neutral-600">İletişim formundan gelen son 100 mesaj.</p>

      <div className="mt-5">
        <StatusNote status={durum} />
      </div>

      {messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          Henüz mesaj yok.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="rounded-xl border border-neutral-200 bg-raised p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold">{message.name}</p>
                  <a href={`mailto:${message.email}`} className="break-all text-sm text-neutral-600 hover:underline">
                    {message.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <time dateTime={message.createdAt.toISOString()} className="text-xs text-neutral-500">
                    {message.createdAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" })}
                  </time>
                  <form action={deleteMessage.bind(null, message.id)}>
                    <ConfirmButton
                      message="Bu mesaj silinecek. Emin misiniz?"
                      aria-label={`${message.name} adlı kişinin mesajını sil`}
                      className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-red-700"
                    >
                      <Trash2 size={16} aria-hidden />
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line break-words text-sm">{message.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
