"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode, X } from "lucide-react";

// Kamerayla barkod okur ve arama kutusuna yazıp aramayı yapar. iPhone Safari'de BarcodeDetector yok; bu yüzden
// ZXing (yalnızca butona basılınca yüklenir) kullanılır. Kamera yalnızca güvenli bağlantıda (https) açılır.
const FORMATS = ["EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "CODE_39", "ITF"] as const;

export default function BarcodeScanner({ inputName = "q" }: { inputName?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    let stop = () => {};
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Kamera yalnızca güvenli bağlantıda (https) açılır. Canlı adresten deneyin.");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        if (cancelled || !videoRef.current) return;
        const hints = new Map<number, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, FORMATS.map((name) => BarcodeFormat[name])],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          videoRef.current,
          (result) => {
            if (!result || cancelled) return;
            cancelled = true;
            controls.stop();
            navigator.vibrate?.(60);
            setOpen(false);
            const form = buttonRef.current?.closest("form");
            const input = form?.elements.namedItem(inputName) as HTMLInputElement | null;
            if (!form || !input) return;
            input.value = result.getText();
            form.requestSubmit();
          },
        );
        stop = () => controls.stop();
        if (cancelled) controls.stop();
      } catch (e) {
        const name = (e as { name?: string }).name;
        setError(
          name === "NotAllowedError"
            ? "Kamera izni verilmedi. Tarayıcı ayarlarından bu site için kamerayı açın."
            : name === "NotFoundError"
              ? "Kamera bulunamadı."
              : "Kamera açılamadı.",
        );
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, inputName]);

  function show() {
    setError("");
    setOpen(true);
  }

  return (
    <>
      <button ref={buttonRef} type="button" onClick={show} className="btn btn-outline" aria-label="Kamerayla barkod oku">
        <ScanBarcode size={18} aria-hidden /> <span className="sm:hidden">Barkod oku</span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Barkod okuyucu" className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="font-bold">Barkodu çerçevenin içine alın</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="grid size-11 place-items-center rounded-full bg-white/15">
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <video ref={videoRef} playsInline muted className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-32 -translate-y-1/2 rounded-xl border-2 border-brand-500" aria-hidden />
          </div>
          {error && <p role="alert" className="p-4 text-center text-sm font-bold text-white">{error}</p>}
        </div>
      )}
    </>
  );
}
