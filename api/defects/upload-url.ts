/** POST /api/defects/upload-url   { category: "B" | "C", fileName }
 *
 *  Staff-only. Creates the `defect_reports` row (status = uploaded) and returns a
 *  short-lived signed URL the client uses to PUT the PDF straight into the
 *  private `defect-pdfs` bucket. Keeping the row insert server-side (service
 *  role) keeps all writes off the authenticated client, consistent with the rest
 *  of the module. After a successful upload the client calls /api/defects/process
 *  with the returned reportId. */
import { HttpError, errorResponse, json, readJson } from "../_lib/http.js";
import { requireStaff } from "../_lib/auth.js";
import { getAdmin } from "../_lib/supabaseAdmin.js";

export async function POST(req: Request): Promise<Response> {
  try {
    // getAdmin() throws when server env is unconfigured — keep it inside the try
    // so it surfaces as clean JSON, not a FUNCTION_INVOCATION_FAILED crash.
    const admin = getAdmin();
    const profile = await requireStaff(req);
    const body = await readJson(req);
    const category = body.category === "B" || body.category === "C" ? body.category : "";
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    if (!category) throw new HttpError(400, "category phải là B hoặc C.");
    if (!fileName) throw new HttpError(400, "Thiếu tên tệp.");
    if (!/\.pdf$/i.test(fileName)) throw new HttpError(400, "Chỉ chấp nhận tệp PDF.");

    const objectPath = `${category}/${crypto.randomUUID()}.pdf`;

    const { data: report, error: iErr } = await admin
      .from("defect_reports")
      .insert({
        category,
        status: "uploaded",
        source_file_name: fileName,
        storage_path: objectPath,
        uploaded_by: profile.id,
      })
      .select("id")
      .single();
    if (iErr || !report) throw new HttpError(500, "Không tạo được bản ghi report.");

    const { data: signed, error: sErr } = await admin.storage
      .from("defect-pdfs")
      .createSignedUploadUrl(objectPath);
    if (sErr || !signed) {
      // Roll back the orphan row so the manage list isn't polluted.
      await admin.from("defect_reports").delete().eq("id", report.id);
      throw new HttpError(500, "Không tạo được URL tải lên.");
    }

    await admin.from("audit_logs").insert({
      actor_user_id: profile.id,
      action: "create_upload_url",
      entity_type: "report",
      entity_id: report.id,
      report_id: report.id,
      after_data: { category, fileName, storage_path: objectPath },
    });

    return json({
      ok: true,
      reportId: report.id,
      path: objectPath,
      token: signed.token,
      signedUrl: signed.signedUrl,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
