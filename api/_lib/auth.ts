/** Caller authentication + role gating for /api functions.
 *
 *  The browser sends the Supabase session access token as `Authorization:
 *  Bearer <token>`. We verify it with the admin client (auth.getUser), then read
 *  the caller's profile (role + approval_status) to gate the action. All writes
 *  then run via the service role, since RLS blocks direct authenticated writes. */
import { getAdmin } from "./supabaseAdmin";
import { HttpError } from "./http";

export type DefectRole = "viewer" | "uploader" | "admin";

export interface Profile {
  id: string;
  email: string;
  role: DefectRole;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
}

export async function requireUser(req: Request): Promise<{ id: string; email: string | null }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Thiếu token đăng nhập.");
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Phiên đăng nhập không hợp lệ.");
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await getAdmin()
    .from("profiles")
    .select("id,email,role,approval_status")
    .eq("id", userId)
    .single();
  if (error || !data) throw new HttpError(403, "Không tìm thấy hồ sơ người dùng.");
  return data as Profile;
}

/** Require an approved uploader or admin. Returns the caller's profile. */
export async function requireStaff(req: Request): Promise<Profile> {
  const user = await requireUser(req);
  const profile = await loadProfile(user.id);
  if (profile.role !== "uploader" && profile.role !== "admin") {
    throw new HttpError(403, "Chỉ nhân viên (uploader/admin) mới được phép thao tác.");
  }
  if (profile.approval_status !== "approved") {
    throw new HttpError(403, "Tài khoản chưa được duyệt.");
  }
  return profile;
}

/** Require an approved admin. */
export async function requireAdmin(req: Request): Promise<Profile> {
  const profile = await requireStaff(req);
  if (profile.role !== "admin") throw new HttpError(403, "Chỉ admin mới được phép thao tác.");
  return profile;
}
