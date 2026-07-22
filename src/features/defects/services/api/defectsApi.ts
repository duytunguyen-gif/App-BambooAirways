/** Browser-side client for the Defects `/api` functions.
 *
 *  Every call carries the caller's Supabase session access token as
 *  `Authorization: Bearer <token>`; the server re-verifies it and does all
 *  privileged writes via the service role. The PDF itself is PUT straight into
 *  the private `defect-pdfs` bucket through a short-lived signed upload URL, so
 *  the (potentially large) file never round-trips through a serverless function.
 *
 *  Upload flow (spec §5):
 *    1. POST /api/defects/upload-url  → { reportId, path, token, signedUrl }
 *    2. uploadToSignedUrl(path, token, file)  (direct to storage)
 *    3. POST /api/defects/process { reportId } → parse + persist draft
 */
import { getSupabase } from "../../../../lib/supabase";

export interface ProcessResult {
  ok: true;
  reportId: string;
  status: string;
  totalRecords: number;
  aiProvider: string;
  aiUsed: boolean;
  totalTokens: number;
}

interface UploadUrlResult {
  ok: true;
  reportId: string;
  path: string;
  token: string;
  signedUrl: string;
}

/** Thrown for any non-2xx /api response; `message` is the server's Vietnamese
 *  error string when present, otherwise a generic fallback. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function postJson<T>(path: string, token: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON (e.g. a crash page) — fall through to status-based message */
  }
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `Máy chủ trả về lỗi ${res.status}.`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

/** Full upload → process pipeline for one PDF. Resolves with the process result
 *  (draft persisted, awaiting review/publish). `onStage` reports progress for the
 *  UI ("uploading" → "processing"). */
export async function uploadAndProcess(
  file: File,
  category: "B" | "C",
  token: string,
  onStage?: (stage: "requesting" | "uploading" | "processing") => void
): Promise<ProcessResult> {
  onStage?.("requesting");
  const signed = await postJson<UploadUrlResult>("/api/defects/upload-url", token, {
    category,
    fileName: file.name,
  });

  onStage?.("uploading");
  const sb = await getSupabase();
  if (!sb) throw new ApiError(0, "Supabase chưa được cấu hình trên trình duyệt.");
  const { error: upErr } = await sb.storage
    .from("defect-pdfs")
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: "application/pdf",
    });
  if (upErr) throw new ApiError(0, `Tải PDF lên thất bại: ${upErr.message}`);

  onStage?.("processing");
  return postJson<ProcessResult>("/api/defects/process", token, {
    reportId: signed.reportId,
  });
}
