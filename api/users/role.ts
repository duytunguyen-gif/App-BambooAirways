/** POST /api/users/role   { userId, role: "viewer" | "uploader" | "admin" }
 *
 *  Admin-only role assignment (spec §3). Setting a role also marks the user
 *  approved (mirrors the admin_set_user_role RPC). Done directly via the service
 *  role after an in-handler admin check, since the SECURITY DEFINER RPC needs a
 *  caller auth.uid() the service role lacks. */
import { HttpError, errorResponse, json, readJson } from "../_lib/http";
import { requireAdmin } from "../_lib/auth";
import { getAdmin } from "../_lib/supabaseAdmin";

const ROLES = new Set(["viewer", "uploader", "admin"]);

export async function POST(req: Request): Promise<Response> {
  const admin = getAdmin();
  try {
    const actor = await requireAdmin(req);
    const body = await readJson(req);
    const userId = typeof body.userId === "string" ? body.userId : "";
    const role = typeof body.role === "string" ? body.role : "";
    if (!userId) throw new HttpError(400, "Thiếu userId.");
    if (!ROLES.has(role)) throw new HttpError(400, "role không hợp lệ.");
    if (userId === actor.id && role !== "admin") {
      throw new HttpError(400, "Admin không thể tự hạ quyền chính mình.");
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("profiles")
      .update({
        role,
        approval_status: "approved",
        approved_by: actor.id,
        approved_at: now,
        updated_at: now,
      })
      .eq("id", userId)
      .select("id,email,role,approval_status")
      .single();
    if (error || !data) throw new HttpError(404, "Không tìm thấy người dùng.");

    await admin.from("audit_logs").insert({
      actor_user_id: actor.id,
      action: "set_user_role",
      entity_type: "profile",
      entity_id: userId,
      after_data: { role: data.role },
    });

    return json({ ok: true, user: data });
  } catch (e) {
    return errorResponse(e);
  }
}
