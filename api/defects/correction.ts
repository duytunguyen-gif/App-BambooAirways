/** POST /api/defects/correction   { recordId, patch, reason }
 *
 *  Staff-only. Applies a manual correction to a single defect record (e.g. after
 *  spotting a mis-parse or an AI error during review, or fixing a published
 *  record). Only a fixed whitelist of human-editable fields may be changed; the
 *  record is flagged `manually_edited` with the editor + timestamp, and the
 *  before/after values are written to the audit log with the given reason. */
import { HttpError, errorResponse, json, readJson } from "../_lib/http";
import { requireStaff } from "../_lib/auth";
import { getAdmin } from "../_lib/supabaseAdmin";

// Fields a reviewer/corrector is allowed to change by hand. Deterministic
// provenance fields (source pages, raw payload, WO, defect_key) are NOT editable.
const EDITABLE = [
  "short_title",
  "full_description",
  "current_due_date",
  "original_due_date",
  "concession_due_date",
  "is_concession",
  "mel_reference",
  "mel_category",
  "issue_station",
  "issued_date",
  "doc_reference",
] as const;

export async function POST(req: Request): Promise<Response> {
  try {
    const admin = getAdmin();
    const profile = await requireStaff(req);
    const body = await readJson(req);
    const recordId = typeof body.recordId === "string" ? body.recordId : "";
    if (!recordId) throw new HttpError(400, "Thiếu recordId.");
    const patchIn = (body.patch && typeof body.patch === "object" ? body.patch : {}) as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason : null;

    // Keep only whitelisted fields that were actually provided.
    const patch: Record<string, unknown> = {};
    for (const f of EDITABLE) {
      if (Object.prototype.hasOwnProperty.call(patchIn, f)) patch[f] = patchIn[f];
    }
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "Không có trường hợp lệ nào để sửa.");
    }

    // Load current values for the audit "before" snapshot.
    const { data: before, error: bErr } = await admin
      .from("defect_records")
      .select(["id", "report_id", ...EDITABLE].join(","))
      .eq("id", recordId)
      .single();
    if (bErr || !before) throw new HttpError(404, "Không tìm thấy defect record.");

    const now = new Date().toISOString();
    const { data: after, error: uErr } = await admin
      .from("defect_records")
      .update({ ...patch, manually_edited: true, edited_by: profile.id, edited_at: now, updated_at: now })
      .eq("id", recordId)
      .select(["id", "report_id", ...EDITABLE].join(","))
      .single();
    if (uErr || !after) throw new HttpError(500, "Không thể lưu chỉnh sửa.");

    await admin.from("audit_logs").insert({
      actor_user_id: profile.id,
      action: "correct_record",
      entity_type: "defect_record",
      entity_id: recordId,
      report_id: (before as unknown as Record<string, unknown>).report_id as string,
      before_data: before,
      after_data: after,
      reason,
    });

    return json({ ok: true, recordId, changedFields: Object.keys(patch) });
  } catch (e) {
    return errorResponse(e);
  }
}
