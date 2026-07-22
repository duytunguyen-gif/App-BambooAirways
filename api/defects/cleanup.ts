/** POST /api/defects/cleanup   (scheduled — Vercel Cron)
 *
 *  Deletes the original PDF blob for reports whose retention window (30 days
 *  since publish) has passed, and stamps `pdf_deleted_at` so the UI can show the
 *  source was purged. The parsed records stay; only the heavy source file goes.
 *  Guarded by a shared secret (CRON_SECRET) rather than a user session, because
 *  the cron caller has no Supabase JWT. */
import { HttpError, errorResponse, json } from "../_lib/http";
import { getAdmin } from "../_lib/supabaseAdmin";

export const config = { maxDuration: 60 };

const RETENTION_DAYS = 30;

function authorizeCron(req: Request): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new HttpError(500, "Máy chủ chưa cấu hình CRON_SECRET.");
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const alt = req.headers.get("x-cron-secret") ?? "";
  if (bearer !== secret && alt !== secret) throw new HttpError(401, "Không được phép.");
}

async function runCleanup(req: Request): Promise<Response> {
  try {
    authorizeCron(req);
    // getAdmin() throws when server env is unconfigured — keep it inside the try
    // so it surfaces as clean JSON, not a FUNCTION_INVOCATION_FAILED crash.
    const admin = getAdmin();

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: expired, error } = await admin
      .from("defect_reports")
      .select("id,storage_path,published_at")
      .lt("published_at", cutoff)
      .is("pdf_deleted_at", null)
      .not("storage_path", "is", null);
    if (error) throw new HttpError(500, "Không truy vấn được report hết hạn.");

    const now = new Date().toISOString();
    const deleted: string[] = [];
    for (const r of expired ?? []) {
      const { error: sErr } = await admin.storage.from("defect-pdfs").remove([r.storage_path]);
      // If the blob is already gone we still stamp the row so we stop retrying.
      if (sErr && !/not found/i.test(sErr.message)) continue;
      await admin.from("defect_reports").update({ pdf_deleted_at: now, updated_at: now }).eq("id", r.id);
      deleted.push(r.id);
    }

    if (deleted.length) {
      await admin.from("audit_logs").insert({
        action: "cleanup_pdfs",
        entity_type: "report",
        after_data: { retentionDays: RETENTION_DAYS, deletedReportIds: deleted },
      });
    }

    return json({ ok: true, retentionDays: RETENTION_DAYS, deletedCount: deleted.length, deleted });
  } catch (e) {
    return errorResponse(e);
  }
}

// Vercel Cron issues a GET (with the CRON_SECRET bearer); allow manual POST too.
export const GET = runCleanup;
export const POST = runCleanup;
