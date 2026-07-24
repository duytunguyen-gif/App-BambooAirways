/** Sign in / register / forgot-password for the Defects module. One component,
 *  three modes. Works standalone (previewable) even when Supabase is
 *  unconfigured — submitting then surfaces the "chưa cấu hình" notice returned
 *  by the auth actions. New sign-ups always land as role=viewer, status=pending
 *  (enforced by the DB trigger), so registration shows a "chờ duyệt" message. */
import { useState } from "react";
import { useAuth } from "../../services/auth/AuthContext";

type Mode = "signin" | "signup" | "forgot";

interface Props {
  onBack: () => void;
  /** Called after a successful sign-in so the caller can return to the viewer. */
  onSignedIn?: () => void;
}

export default function AuthScreen({ onBack, onSignedIn }: Props) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await auth.signIn(email.trim(), password);
        if (error) setError(error);
        else onSignedIn?.();
      } else if (mode === "signup") {
        const { error } = await auth.signUp(email.trim(), password, displayName.trim() || undefined);
        if (error) setError(error);
        else
          setNotice(
            "Đăng ký thành công. Tài khoản đang ở trạng thái chờ duyệt — vui lòng đợi quản trị viên phê duyệt."
          );
      } else {
        const { error } = await auth.resetPassword(email.trim());
        if (error) setError(error);
        else setNotice("Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.");
      }
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signin" ? "Đăng nhập" : mode === "signup" ? "Đăng ký" : "Quên mật khẩu";

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex min-h-[40px] items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white"
      >
        <BackIcon /> Quay lại
      </button>

      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-400">
        Dành cho nhân viên được cấp quyền xem/quản lý dữ liệu defect.
      </p>

      {!auth.configured && (
        <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-200">
          Supabase chưa được cấu hình trên bản này — form chỉ để xem giao diện.
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "signup" && (
          <Field
            label="Tên hiển thị (tuỳ chọn)"
            type="text"
            value={displayName}
            onChange={setDisplayName}
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        {mode !== "forgot" && (
          <Field
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
        )}

        {error && (
          <p className="rounded-lg bg-warn-red/10 px-3 py-2 text-[13px] text-red-200">{error}</p>
        )}
        {notice && (
          <p className="rounded-lg bg-bamboo-green/10 px-3 py-2 text-[13px] text-accent-green">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-bamboo-green px-4 font-semibold text-[#0b0b0c] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Đang xử lý…" : title}
        </button>
      </form>

      <div className="mt-4 space-y-1 text-center text-[13px] text-gray-400">
        {mode === "signin" && (
          <>
            <p>
              Chưa có tài khoản?{" "}
              <Switch onClick={() => { reset(); setMode("signup"); }}>Đăng ký</Switch>
            </p>
            <p>
              <Switch onClick={() => { reset(); setMode("forgot"); }}>Quên mật khẩu?</Switch>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p>
            Đã có tài khoản?{" "}
            <Switch onClick={() => { reset(); setMode("signin"); }}>Đăng nhập</Switch>
          </p>
        )}
        {mode === "forgot" && (
          <p>
            <Switch onClick={() => { reset(); setMode("signin"); }}>Về đăng nhập</Switch>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-gray-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border border-line bg-ink-700 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-teal-accent focus:outline-none"
      />
    </label>
  );
}

function Switch({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-semibold text-accent-teal hover:underline">
      {children}
    </button>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
