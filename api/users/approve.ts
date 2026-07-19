/** POST /api/users/approve   { userId, action: "approve" | "reject" | "suspend", reason? }
 *
 *  Approval workflow (spec §3). `approve` grants an approved viewer and `reject`
 *  are open to any staff (uploader/admin); `suspend` is admin-only. The DB
 *  approval RPCs are SECURITY DEFINER keyed on auth.uid(), which the service role
 *  does not have — so we re-check the caller's role here (requireStaff/Admin) and
 *  perform the profiles update + audit directly via the service role. */
import { HttpError, errorResponse, json, readJson } from "../_lib/http";
import { requireStaff } from "../_lib/auth";
import { getAdmin } from "../_lib/supabaseAdmin";

export async function POST(req: Request): Promise<Response> {
  const admin = getAdmin();
  try {
    const profile = await requireStaff(req);
    const body = await readJson(req);
    const userId = typeof body.userId === "string" ? body.userId : "";
    const action = typeof body.action === "string" ? body.action : "";
    const reason = typeof body.reason === "string" ? body.reason : null;
    if (!userId) throw new HttpError(400, "Thiếu userId.");
    if (!["approve", "reject", "suspend"].includes(action)) {
      throw new HttpError(400, "action phải là approve | reject | suspend.");
    }
    if (userId === profile.id) throw new HttpError(400, "Không thể tự thao tác trên chính mình.");
    // suspend is destructive to access → admin only.
    if (action === "suspend" && profile.role !== "admin") {
      throw new HttpError(403, "Chỉ admin mới được đình chỉ người dùng.");
    }

    const now = new Date().toISOString();
    const patch =
      action === "approve"
        ? { role: "viewer", approval_status: "approved", approved_by: profile.id, approved_at: now, updated_at: now }
        : action === "reject"
          ? { approval_status: "rejected", updated_at: now }
          : { approval_status: "suspended", updated_at: now };

    const { data, error } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("id,email,role,approval_status")
      .single();
    if (error || !data) throw new HttpError(404, "Không tìm thấy người dùng.");

    await admin.from("audit_logs").insert({
      actor_user_id: profile.id,
      action: `user_${action}`,
      entity_type: "profile",
      entity_id: userId,
      after_data: { approval_status: data.approval_status, role: data.role },
      reason,
    });

    return json({ ok: true, user: data });
  } catch (e) {
    return errorResponse(e);
  }
}
