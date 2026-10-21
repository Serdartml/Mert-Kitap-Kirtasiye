"use client";

import { useRef, useState } from "react";
import { Loader2, Play, Square } from "lucide-react";
import { fetchBarcodeCovers } from "@/actions/covers";

// Barkoddan kapak getirmeyi gruplar halinde art arda çağırır (her çağrı birkaç ürünü işler) ve ilerlemeyi gösterir.
// Durdurulabilir; yeniden başlatınca kapağı olmayan ürünler baştan taranır (kapağı eklenenler zaten atlanır).
export default function CoverFetcher({ pending }: { pending: number }) {
  const [running, setRunning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [added, setAdded] = useState(0);
  const [message, setMessage] = useState("");
  const stop = useRef(false);

  async function start() {
    stop.current = false;
    setRunning(true);
    setScanned(0);
    setAdded(0);
    setMessage("");
    let cursor = "";
    let totalScanned = 0;
    let totalAdded = 0;
    try {
      for (;;) {
        const result = await fetchBarcodeCovers(cursor);
        if (result.error) {
          setMessage(result.error);
          break;
        }
        totalScanned += result.scanned;
        totalAdded += result.added;
        setScanned(totalScanned);
        setAdded(totalAdded);
        if (result.cursor === null) {
          setMessage("Tarama bitti.");
          break;
        }
        if (stop.current) {
          setMessage("Durduruldu.");
          break;
        }
        cursor = result.cursor;
      }
    } catch {
      setMessage("Bağlantı hatası; tekrar başlatabilirsiniz (eklenen kapaklar korunur).");
    }
    setRunning(false);
  }

  return (
    <div className="mt-5 rounded-xl border border-neutral-200 bg-raised p-5">
      <p className="text-sm">
        Görseli olmayan ve ISBN barkodlu (978/979) <span className="font-extrabold">{pending}</span> ürün var.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {running ? (
          <button type="button" onClick={() => (stop.current = true)} className="btn btn-outline py-2.5">
            <Square size={16} aria-hidden /> Durdur
          </button>
        ) : (
          <button type="button" onClick={start} className="btn btn-primary py-2.5">
            <Play size={16} aria-hidden /> Kapakları getir
          </button>
        )}
        {running && <Loader2 size={18} className="animate-spin" aria-hidden />}
        <span aria-live="polite" className="text-sm font-semibold">
          {scanned > 0 || running ? `${scanned} ürün tarandı, ${added} kapak eklendi` : ""} {message}
        </span>
      </div>
    </div>
  );
}
