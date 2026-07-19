/** A/C Defects tab — entry point.
 *  Always shows the reference warning (spec: never hidden), then routes between
 *  the viewer, the auth screens and the staff Manage shell. Auth is scoped here
 *  via <AuthProvider>; the rest of the app stays public. When Supabase is
 *  unconfigured the module runs in demo mode (in-browser fixtures) so the whole
 *  flow is previewable without a project. */
import { useState } from "react";
import ReferenceWarning from "./components/ReferenceWarning";
import DefectsViewer from "./components/DefectsViewer";
import AuthScreen from "./components/auth/AuthScreen";
import AccountBar, { AccountStatusBanner } from "./components/auth/AccountBar";
import ManageScreen from "./components/manage/ManageScreen";
import { AuthProvider, useAuth } from "./services/auth/AuthContext";

type View = "main" | "auth" | "manage";

export default function DefectsTab() {
  return (
    <AuthProvider>
      <DefectsTabInner />
    </AuthProvider>
  );
}

function DefectsTabInner() {
  const [view, setView] = useState<View>("main");

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">A/C Defects</h2>
        <p className="mt-0.5 text-xs text-gray-400">ADD B / ADD C defect list</p>
      </div>
      <ReferenceWarning />

      {view === "auth" ? (
        <div className="mt-4">
          <AuthScreen onBack={() => setView("main")} onSignedIn={() => setView("main")} />
        </div>
      ) : view === "manage" ? (
        <div className="mt-4">
          <ManageScreen onBack={() => setView("main")} />
        </div>
      ) : (
        <>
          <AccountBar onSignIn={() => setView("auth")} onManage={() => setView("manage")} />
          <AccountStatusBanner />
          <DataArea />
        </>
      )}
    </div>
  );
}

/** Chooses what to render below the account bar based on auth state. */
function DataArea() {
  const auth = useAuth();

  if (!auth.configured) {
    return (
      <>
        <p className="mt-3 rounded-lg bg-ink-800 px-3 py-1.5 text-center text-[11px] text-gray-500">
          Dữ liệu demo — Supabase chưa được cấu hình
        </p>
        <DefectsViewer />
      </>
    );
  }
  if (auth.loading) {
    return <p className="mt-6 text-center text-sm text-gray-500">Đang kiểm tra đăng nhập…</p>;
  }
  if (auth.isApproved) return <DefectsViewer />;
  // Signed out → AccountBar already prompts sign-in.
  // Pending/rejected/suspended → AccountStatusBanner already explains.
  return null;
}
