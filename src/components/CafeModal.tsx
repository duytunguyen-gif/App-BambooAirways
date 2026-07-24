import { useState } from "react";

const QR_SRC = "/qr-cafe.jpg";
const DOWNLOAD_NAME = "qr-cafe-duy-tu.jpg";

interface CafeModalProps {
  open: boolean;
  onClose: () => void;
}

/** "Buy me a coffee" support modal: shows a donation QR with a download button.
 *  The QR image lives at /qr-cafe.png (dropped into /public separately). */
export default function CafeModal({ open, onClose }: CafeModalProps) {
  const [imgOk, setImgOk] = useState(true);

  if (!open) return null;

  async function download() {
    try {
      const res = await fetch(QR_SRC);
      if (!res.ok) throw new Error("not found");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: let the browser fetch it directly.
      triggerDownload(QR_SRC);
    }
  }

  function triggerDownload(href: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = DOWNLOAD_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ủng hộ cốc cà phê"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      <div className="relative z-10 w-full max-w-xs rounded-2xl border border-line bg-ink-800 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white">Ủng hộ cốc cà phê ☕</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-ink-700 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* QR */}
        <div className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden rounded-xl bg-[#ffffff] p-2">
          {imgOk ? (
            <img
              src={QR_SRC}
              alt="Mã QR ủng hộ"
              className="h-full w-full object-contain"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="px-3 text-center text-xs font-medium text-gray-500">
              Chưa có ảnh QR.
              <br />
              Đặt file <span className="font-mono">qr-cafe.jpg</span> vào thư mục{" "}
              <span className="font-mono">/public</span>.
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs leading-relaxed text-gray-400">
          Quét mã để mời mình một cốc cà phê. Cảm ơn anh em! 🙌
        </p>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={download}
            disabled={!imgOk}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-bamboo-green py-2.5 text-sm font-bold text-black disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Tải mã QR
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line py-2.5 text-sm font-semibold text-gray-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
