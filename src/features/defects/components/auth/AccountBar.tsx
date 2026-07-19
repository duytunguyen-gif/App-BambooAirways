/** Compact account row at the top of the Defects tab: a "Đăng nhập" button when
 *  signed out, or the current account (email + role) with sign-out and a Manage
 *  entry for staff when signed in. Hidden entirely when Supabase is unconfigured
 *  (nothing to sign into on this build). */
import { useAuth, type ApprovalStatus, type DefectRole } from "../../services/auth/AuthContext";

const ROLE_LABEL: Record<DefectRole, string> = {
  viewer: "Viewer",
  uploader: "Uploader",
  admin: "Admin",
};

interface Props {
  onSignIn: () => void;
  onManage: () => void;
}

export default function AccountBar({ onSignIn, onManage }: Props) {
  const auth = useAuth();
  if (!auth.configured || auth.loading) return null;

  if (!auth.user) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-ink-800 px-3 py-2.5">
        <span className="text-[13px] text-gray-400">Đăng nhập để xem dữ liệu đã publish</span>
        <button
          type="button"
          onClick={onSignIn}
          className="min-h-[36px] shrink-0 rounded-lg bg-bamboo-green px-3 text-[13px] font-semibold text-ink-900 hover:opacity-90"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-ink-800 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-white">
            {auth.profile?.displayName || auth.user.email}
          </span>
          {auth.profile && <RoleBadge role={auth.profile.role} status={auth.profile.approvalStatus} />}
        </div>
        {auth.profile?.displayName && (
          <div className="truncate text-[11px] text-gray-500">{auth.user.email}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {auth.isStaff && (
          <button
            type="button"
            onClick={onManage}
            className="min-h-[36px] rounded-lg bg-ink-700 px-3 text-[13px] font-semibold text-white ring-1 ring-inset ring-line hover:bg-ink-600"
          >
            Manage
          </button>
        )}
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="min-h-[36px] rounded-lg px-2 text-[13px] font-medium text-gray-400 hover:text-white"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

function RoleBadge({ role, status }: { role: DefectRole; status: ApprovalStatus }) {
  if (status !== "approved") return null;
  return (
    <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-semibold text-gray-300 ring-1 ring-inset ring-line">
      {ROLE_LABEL[role]}
    </span>
  );
}

/** Full-width banner for non-approved account states. Returns null when the
 *  account is approved (nothing to warn about). */
export function AccountStatusBanner() {
  const auth = useAuth();
  const status = auth.profile?.approvalStatus;
  if (!auth.user || !status || status === "approved") return null;

  const copy: Record<Exclude<typeof status, "approved">, { tone: string; text: string }> = {
    pending: {
      tone: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      text: "Tài khoản đang chờ quản trị viên phê duyệt. Bạn sẽ xem được dữ liệu sau khi được duyệt.",
    },
    rejected: {
      tone: "border-warn-red/40 bg-warn-red/10 text-red-200",
      text: "Tài khoản đã bị từ chối. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.",
    },
    suspended: {
      tone: "border-warn-red/40 bg-warn-red/10 text-red-200",
      text: "Tài khoản đã bị tạm ngưng. Vui lòng liên hệ quản trị viên.",
    },
  };
  const { tone, text } = copy[status];
  return <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[13px] ${tone}`}>{text}</div>;
}
