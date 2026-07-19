/** Staff-only management shell: Upload · History · Users · Audit. The interactive
 *  wiring (PDF → parse → review → publish, user approval, audit feed) is the
 *  Phase 6 `/api` work; each panel here renders its layout and a notice where a
 *  server endpoint is still pending, so the flow is reviewable before the backend
 *  lands. Gated to uploaders/admins by the caller. */
import { useState } from "react";
import { useAuth } from "../../services/auth/AuthContext";

type Panel = "upload" | "history" | "users" | "audit";

const PANELS: { key: Panel; label: string; adminOnly?: boolean }[] = [
  { key: "upload", label: "Upload" },
  { key: "history", label: "History" },
  { key: "users", label: "Users" },
  { key: "audit", label: "Audit", adminOnly: true },
];

interface Props {
  onBack: () => void;
}

export default function ManageScreen({ onBack }: Props) {
  const auth = useAuth();
  const [panel, setPanel] = useState<Panel>("upload");
  const visible = PANELS.filter((p) => !p.adminOnly || auth.isAdmin);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex min-h-[40px] items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white"
      >
        <BackIcon /> Defects
      </button>

      <h2 className="text-lg font-bold text-white">Quản lý dữ liệu Defects</h2>
      <p className="mt-0.5 text-xs text-gray-400">
        Chỉ dành cho {auth.isAdmin ? "Admin" : "Uploader"} — {auth.profile?.email}
      </p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto">
        {visible.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPanel(p.key)}
            className={`min-h-[36px] shrink-0 rounded-lg px-3 text-[13px] font-semibold transition-colors ${
              panel === p.key
                ? "bg-teal-accent/15 text-teal-accent ring-1 ring-inset ring-teal-accent/40"
                : "bg-ink-800 text-gray-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {panel === "upload" && <UploadPanel />}
        {panel === "history" && <PendingPanel title="Lịch sử report" note="Danh sách report đã upload/publish + diff giữa các lần sẽ hiển thị ở đây." />}
        {panel === "users" && <PendingPanel title="Duyệt người dùng" note="Danh sách tài khoản pending + thao tác duyệt/từ chối (RPC an toàn phía DB) sẽ ở đây." />}
        {panel === "audit" && <PendingPanel title="Nhật ký audit" note="Nhật ký thao tác (upload, publish, duyệt user, cleanup) — chỉ Admin xem." />}
      </div>
    </div>
  );
}

function UploadPanel() {
  const [category, setCategory] = useState<"B" | "C">("B");
  const [file, setFile] = useState<File | null>(null);

  return (
    <section className="space-y-3">
      <div>
        <span className="mb-1.5 block text-[12px] font-medium text-gray-400">Loại report</span>
        <div className="grid grid-cols-2 gap-2">
          {(["B", "C"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`min-h-[40px] rounded-xl border text-sm font-semibold transition-colors ${
                category === c
                  ? "border-teal-accent bg-teal-accent/10 text-white"
                  : "border-line-soft bg-ink-800 text-gray-400 hover:text-white"
              }`}
            >
              ADD {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-[12px] font-medium text-gray-400">File PDF (AMOS export)</span>
        <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-ink-700 px-3 text-sm text-gray-300 hover:border-teal-accent">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <UploadIcon />
          {file ? file.name : "Chọn file PDF…"}
        </label>
        {file && (
          <p className="mt-1 text-[11px] text-gray-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB — sẽ được kiểm tra MIME + magic bytes phía server.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-200">
        Bước xử lý (parse → xem lại/sửa tay → publish) chạy qua <code className="text-amber-100">/api/defects/process</code> —
        sẽ hoạt động khi backend Phase 6 được ráp. Không dùng AI; dữ liệu không gửi ra ngoài.
      </div>

      <button
        type="button"
        disabled
        className="min-h-[44px] w-full cursor-not-allowed rounded-xl bg-ink-700 px-4 font-semibold text-gray-500"
      >
        Xử lý report (chưa khả dụng)
      </button>
    </section>
  );
}

function PendingPanel({ title, note }: { title: string; note: string }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-2 rounded-xl border border-line-soft bg-ink-800 px-3 py-3 text-[13px] leading-relaxed text-gray-400">
        {note}
      </p>
    </section>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
