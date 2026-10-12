"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

// Mağazanın şu an açık olup olmadığı: çalışma saatlerinden (site.hours) Türkiye saatine göre hesaplanır.
// Zaman istemcide okunur (sunucuda sayfa önceden hazırlandığı için saat bayatlar); ilk çizimde yer
// tutucu görünür, dakikada bir yenilenir.

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const SOON_MINUTES = 60;

const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
};

// Türkiye saatine göre gün (0 = Pazar) ve gün içindeki dakika.
function istanbulNow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const rowFor = (day: number) => site.hours.find((row) => (row.dayNumbers as readonly number[]).includes(day));

interface Status {
  open: boolean;
  soon: boolean;
  text: string;
}

function computeStatus(date: Date): Status {
  const { day, minutes } = istanbulNow(date);
  const today = rowFor(day);

  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    const left = toMinutes(today.close) - minutes;
    return left <= SOON_MINUTES
      ? { open: true, soon: true, text: `Şu an açık · kapanmaya ${left} dk kaldı` }
      : { open: true, soon: false, text: `Şu an açık · ${today.close}'e kadar` };
  }

  // Kapalı: bugün henüz açılmadıysa bugün, değilse sıradaki açık günün açılışı.
  if (today && minutes < toMinutes(today.open)) {
    return { open: false, soon: false, text: `Şu an kapalı · bugün ${today.open}'da açılıyoruz` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const next = (day + offset) % 7;
    const row = rowFor(next);
    if (row) {
      const when = offset === 1 ? "yarın" : DAY_NAMES[next];
      return { open: false, soon: false, text: `Şu an kapalı · ${when} ${row.open}'da açılıyoruz` };
    }
  }
  return { open: false, soon: false, text: "Şu an kapalı" };
}

export default function OpenStatus({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const update = () => setStatus(computeStatus(new Date()));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Yer tutucu aynı yükseklikte: durum gelince sayfa zıplamasın.
  if (!status) return <p aria-hidden className={`h-7 ${className}`} />;

  const dot = status.open ? (status.soon ? "bg-orange-500" : "bg-green-500") : "bg-red-500";
  return (
    <p role="status" className={`inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-sm font-extrabold text-white ${className}`}>
      <span aria-hidden className="relative grid size-2.5 place-items-center">
        {status.open && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dot}`} />}
        <span className={`relative size-2.5 rounded-full ${dot}`} />
      </span>
      {status.text}
    </p>
  );
}
