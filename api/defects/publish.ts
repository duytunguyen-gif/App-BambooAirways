/** POST /api/defects/publish   { reportId }
 *
 *  Staff-only. Publishes a report that has been processed (and human-reviewed):
 *  it becomes the single current report of its category, the previously current
 *  report is superseded, and a `defect_history_events` diff (NEW / UPDATED /
 *  UNCHANGED / REMOVED_FROM_LATEST_REPORT) is recorded against it — see spec §14.
 *
 *  The diff reuses the viewer's `diffReports`, so both reports are mapped from
 *  their stored `defect_records` (+ limits) into `Defect[]` first. Writes run via
 *  the service role. There is no cross-statement transaction available from the
 *  JS client, so the order is chosen to keep the `one current per category`
 *  unique index satisfied at every step: supersede the old current BEFORE marking
 *  this one current. */
import { HttpError, errorResponse, json, readJson } from "../_lib/http";
import { requireStaff } from "../_lib/auth";
import { getAdmin } from "../_lib/supabaseAdmin";
import {
  buildPublishPlan,
  type RecordForDiff,
} from "../../src/features/defects/services/persist/publishPlan";
import {
  recordToDefect,
  type DefectRecordDbRow,
  type DefectLimitDbRow,
} from "../../src/features/defects/services/persist/recordToDefect";

const PUBLISHABLE = new Set(["review_required", "ready_to_publish"]);

/** Load a report's records (+ nested limits) as RecordForDiff rows. */
async function loadRecordsForDiff(
  admin: ReturnType<typeof getAdmin>,
  reportId: string
): Promise<RecordForDiff[]> {
  const { data, error } = await admin
    .from("defect_records")
    .select(
      "id,category,registration,defect_key,wo_number,defect_id_raw,defect_id_normalized," +
        "short_title,full_description,issued_date,issue_station,doc_reference,mel_reference," +
        "mel_category,current_due_date,original_due_date,concession_due_date,is_concession," +
        "raw_declared_deadline,source_page_start,source_page_end,defect_limits(*)"
    )
    .eq("report_id", reportId);
  if (error) throw new HttpError(500, "Không đọc được dữ liệu defect của report.");
  return (data ?? []).map((row) => {
    const { defect_limits, ...rec } = row as unknown as DefectRecordDbRow & {
      defect_limits: DefectLimitDbRow[];
    };
    return {
      recordId: rec.id,
      defectKey: rec.defect_key,
      defect: recordToDefect(rec, defect_limits ?? []),
    };
  });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const admin = getAdmin();
    const profile = await requireStaff(req);
    const body = await readJson(req);
    const reportId = typeof body.reportId === "string" ? body.reportId : "";
    if (!reportId) throw new HttpError(400, "Thiếu reportId.");

    // 1. Load + gate the report being published.
    const { data: report, error: rErr } = await admin
      .from("defect_reports")
      .select("id,category,status,is_current")
      .eq("id", reportId)
      .single();
    if (rErr || !report) throw new HttpError(404, "Không tìm thấy report.");
    if (report.status === "published") throw new HttpError(409, "Report đã được publish.");
    if (!PUBLISHABLE.has(report.status)) {
      throw new HttpError(409, "Report chưa xử lý xong; không thể publish.");
    }

    // 2. Find the current published report of the same category (if any).
    const { data: prevReport, error: pErr } = await admin
      .from("defect_reports")
      .select("id")
      .eq("category", report.category)
      .eq("is_current", true)
      .maybeSingle();
    if (pErr) throw new HttpError(500, "Không tra được report hiện hành.");
    const previousReportId: string | null = prevReport?.id ?? null;

    // 3. Map both reports to Defect[] and diff.
    const next = await loadRecordsForDiff(admin, reportId);
    const previous = previousReportId ? await loadRecordsForDiff(admin, previousReportId) : [];
    const plan = buildPublishPlan({ previousReportId, newReportId: reportId, previous, next });

    // 4. Write. Supersede the old current FIRST (keeps the one-current unique
    //    index satisfied), then mark this report current, then record history.
    const now = new Date().toISOString();
    if (previousReportId) {
      const { error } = await admin
        .from("defect_reports")
        .update({ is_current: false, status: "superseded", updated_at: now })
        .eq("id", previousReportId);
      if (error) throw new HttpError(500, "Không thể chuyển report cũ sang superseded.");
    }

    const { error: pubErr } = await admin
      .from("defect_reports")
      .update({
        is_current: true,
        status: "published",
        published_by: profile.id,
        published_at: now,
        updated_at: now,
      })
      .eq("id", reportId);
    if (pubErr) throw new HttpError(500, "Không thể publish report.");

    if (plan.historyRows.length) {
      const { error: hErr } = await admin.from("defect_history_events").insert(plan.historyRows);
      // History is best-effort context; a failure here should not un-publish.
      if (hErr) {
        await admin.from("audit_logs").insert({
          actor_user_id: profile.id,
          action: "publish_history_failed",
          entity_type: "report",
          entity_id: reportId,
          report_id: reportId,
          after_data: { message: hErr.message },
        });
      }
    }

    await admin.from("audit_logs").insert({
      actor_user_id: profile.id,
      action: "publish_report",
      entity_type: "report",
      entity_id: reportId,
      report_id: reportId,
      before_data: previousReportId ? { supersededReportId: previousReportId } : null,
      after_data: { category: report.category, counts: plan.counts },
    });

    return json({
      ok: true,
      reportId,
      category: report.category,
      supersededReportId: previousReportId,
      counts: plan.counts,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
