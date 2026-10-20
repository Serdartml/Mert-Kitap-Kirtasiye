"use client";

// Bulunduğu formdaki tüm "ids" onay kutularını işaretler / kaldırır (sunucuda çizilen, kendi durumu olmayan listeler için).
export default function CheckAll({ label }: { label: string }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-bold">
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-brand-500"
        onChange={(event) => {
          const checked = event.currentTarget.checked;
          event.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
            box.checked = checked;
          });
        }}
      />
      {label}
    </label>
  );
}
