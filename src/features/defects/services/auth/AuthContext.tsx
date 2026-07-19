/** Auth state for the Defects module, scoped to the Defects feature (the rest of
 *  the app — Fuel/MEL/ECAM/CAAV — stays fully public and unauthenticated).
 *
 *  Backed by Supabase email/password auth + the `profiles` table (role +
 *  approval_status). Degrades gracefully when Supabase is unconfigured
 *  (`configured === false`) so the module is previewable without a project: the
 *  auth screens still render and every action returns a friendly "chưa cấu hình"
 *  error instead of throwing. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../../../../lib/supabase";

export type DefectRole = "viewer" | "uploader" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

export interface DefectProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: DefectRole;
  approvalStatus: ApprovalStatus;
}

interface ActionResult {
  error?: string;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: { id: string; email: string | null } | null;
  profile: DefectProfile | null;
  /** approval_status === 'approved'. */
  isApproved: boolean;
  /** role ∈ {uploader, admin}. */
  isStaff: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<ActionResult>;
  refreshProfile: () => Promise<void>;
}

const NOT_CONFIGURED: ActionResult = {
  error: "Supabase chưa được cấu hình. Xem docs/DEFECTS_SETUP.md để thiết lập.",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function mapProfile(row: Record<string, unknown>): DefectProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    displayName: (row.display_name as string | null) ?? null,
    role: (row.role as DefectRole) ?? "viewer",
    approvalStatus: (row.approval_status as ApprovalStatus) ?? "pending",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DefectProfile | null>(null);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    const sb = await getSupabase();
    if (!sb) return;
    const { data, error } = await sb
      .from("profiles")
      .select("id,email,display_name,role,approval_status")
      .eq("id", userId)
      .single();
    if (!mounted.current) return;
    setProfile(error || !data ? null : mapProfile(data));
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!configured) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    (async () => {
      const sb = await getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data } = await sb.auth.getSession();
      if (!mounted.current) return;
      setSession(data.session ?? null);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);

      const sub = sb.auth.onAuthStateChange((_event, s) => {
        if (!mounted.current) return;
        setSession(s ?? null);
        if (s?.user) void loadProfile(s.user.id);
        else setProfile(null);
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();
    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, [configured, loadProfile]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const sb = await getSupabase();
    if (!sb) return NOT_CONFIGURED;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password, displayName) => {
      const sb = await getSupabase();
      if (!sb) return NOT_CONFIGURED;
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: displayName ? { data: { display_name: displayName } } : undefined,
      });
      return error ? { error: error.message } : {};
    },
    []
  );

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  }, []);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (email) => {
    const sb = await getSupabase();
    if (!sb) return NOT_CONFIGURED;
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    return error ? { error: error.message } : {};
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
    return {
      configured,
      loading,
      session,
      user,
      profile,
      isApproved: profile?.approvalStatus === "approved",
      isStaff: profile?.role === "uploader" || profile?.role === "admin",
      isAdmin: profile?.role === "admin",
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    };
  }, [configured, loading, session, profile, signIn, signUp, signOut, resetPassword, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
