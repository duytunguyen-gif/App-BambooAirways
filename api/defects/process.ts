/** POST /api/defects/process   { reportId }
 *
 *  Staff-only. Takes an already-uploaded report row (PDF in the defect-pdfs
 *  bucket), runs: download → extract → deterministic parse → optional AI cleanup
 *  → persists a DRAFT (report_aircraft + defect_records + defect_limits) and
 *  sets the report status to review_required / ready_to_publish. Idempotent:
 *  re-processing clears the previous draft rows first. Publishing is a separate
 *  step (/api/defects/publish) after human review. */
import { HttpError, errorResponse, json, readJson } from "../_lib/http";
import { requireStaff } from "../_lib/auth";
import { getAdmin } from "../_lib/supabaseAdmin";
import { processReportFromBytes } from "../../src/features/defects/services/process/processReportFromBytes";
import { getAiProvider } from "../../src/features/defects/services/ai";
import { buildDraftPlan } from "../../src/features/defects/services/persist/draftRows";

// AI + PDF parsing can take a while for a big report.
export const config = { maxDuration: 60 };

export async function POST(req: Request): Promise<Response> {
  const admin = getAdmin();
  let reportId = "";
  try {
    const profile = await requireStaff(req);
    const body = await readJson(req);
    reportId = typeof body.reportId === "string" ? body.reportId : "";
    if (!reportId) throw new HttpError(400, "Thiếu reportId.");

    const { data: report, error: rErr } = await admin
      .from("defect_reports")
      .select("id,status,storage_path,pdf_deleted_at")
      .eq("id", reportId)
      .single();
    if (rErr || !report) throw new HttpError(404, "Không tìm thấy report.");
    if (report.status === "published") throw new HttpError(409, "Report đã publish; không xử lý lại.");
    if (report.pdf_deleted_at) throw new HttpError(410, "PDF gốc đã bị xoá theo lịch dọn dẹp.");

    await admin
      .from("defect_reports")
      .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", reportId);

    // Download the original PDF via the service role (bucket is private).
    const { data: file, error: dErr } = await admin.storage
      .from("defect-pdfs")
      .download(report.storage_path);
    if (dErr || !file) throw new HttpError(500, "Không tải được PDF từ storage.");
    const bytes = new Uint8Array(await file.arrayBuffer());

    // Parse (+ optional AI cleanup) and build the draft rows.
    const provider = getAiProvider(process.env as Record<string, string | undefined>);
    const processed = await processReportFromBytes(bytes, provider);
    const plan = buildDraftPlan(processed, reportId);
    plan.reportPatch.ai_model = process.env.AI_MODEL ?? null;

    // Idempotent re-process: drop the previous draft (records + limits cascade).
    await admin.from("report_aircraft").delete().eq("report_id", reportId);
    await admin.from("defect_records").delete().eq("report_id", reportId);

    let totalRecords = 0;
    for (const ac of plan.aircraft) {
      const { data: acRow, error: acErr } = await admin
        .from("report_aircraft")
        .insert(ac.row)
        .select("id")
        .single();
      if (acErr || !acRow) throw new HttpError(500, `Lỗi ghi tàu ${ac.row.registration}.`);
      for (const d of ac.defects) {
        const { data: recRow, error: recErr } = await admin
          .from("defect_records")
          .insert({ ...d.record, report_aircraft_id: acRow.id })
          .select("id")
          .single();
        if (recErr || !recRow) throw new HttpError(500, "Lỗi ghi defect record.");
        totalRecords++;
        if (d.limits.length) {
          const rows = d.limits.map((l) => ({ ...l, defect_record_id: recRow.id }));
          const { error: lErr } = await admin.from("defect_limits").insert(rows);
          if (lErr) throw new HttpError(500, "Lỗi ghi defect limit.");
        }
      }
    }

    await admin
      .from("defect_reports")
      .update({ ...plan.reportPatch, updated_at: new Date().toISOString() })
      .eq("id", reportId);

    await admin.from("audit_logs").insert({
      actor_user_id: profile.id,
      action: "process_report",
      entity_type: "report",
      entity_id: reportId,
      report_id: reportId,
      after_data: plan.reportPatch.processing_summary,
    });

    return json({
      ok: true,
      reportId,
      status: plan.reportPatch.status,
      totalRecords,
      aiProvider: processed.aiProvider,
      aiUsed: processed.aiUsed,
      totalTokens: processed.totalTokens,
    });
  } catch (e) {
    // Best-effort: mark the report failed so the UI can show it (never throws).
    if (reportId) {
      try {
        await admin
          .from("defect_reports")
          .update({
            status: "failed",
            error_message: e instanceof HttpError ? e.message : "Xử lý thất bại.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportId);
      } catch {
        /* ignore */
      }
    }
    return errorResponse(e);
  }
}
