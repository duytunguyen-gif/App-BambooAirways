/** Admin / data management. No backend: edits live in a localStorage overlay
 *  and are exported as JSON files to commit into public/data/reset/.
 *
 *  - Add / edit / delete fault items (overlay).
 *  - Import JSON (validated with zod, duplicate faultTitle check).
 *  - Export index.json + per-chapter ata-XX.json exactly matching the repo. */
import { useMemo, useState } from "react";
import type { AtaChapterMeta, ResetFaultItem } from "../types";
import { validateFaultItem, validateFaultItems } from "../schema";
import { slugify, uniqueSlug } from "../slug";
import {
  applyOverlay,
  hasOverlay,
  type OverlayState,
} from "../storage";
import { computeChapters } from "../meta";
import { ScreenHeader, EmptyBox } from "../components/ui";
import { SearchBar } from "../components/SearchControls";

const linesToArray = (s: string) =>
  s.split("\n").map((x) => x.trim()).filter(Boolean);
const arrayToLines = (a?: string[]) => (a ?? []).join("\n");

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Admin({
  baseItems,
  baseChapters,
  overlay,
  onOverlayChange,
  onBack,
}: {
  baseItems: ResetFaultItem[];
  baseChapters: AtaChapterMeta[];
  overlay: OverlayState;
  onOverlayChange: (o: OverlayState) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"list" | "edit" | "import">("list");
  const [editing, setEditing] = useState<ResetFaultItem | null>(null);
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => applyOverlay(baseItems, overlay).sort((a, b) => a.ataChapter.localeCompare(b.ataChapter) || a.faultTitle.localeCompare(b.faultTitle)),
    [baseItems, overlay]
  );

  const shown = items.filter((i) =>
    `${i.faultTitle} ${i.ataChapter} ${i.system ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const usedIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const upsert = (item: ResetFaultItem) => {
    onOverlayChange({
      items: { ...overlay.items, [item.id]: item },
      deleted: overlay.deleted.filter((d) => d !== item.id),
    });
  };

  const remove = (id: string) => {
    const nextItems = { ...overlay.items };
    delete nextItems[id];
    // Only base-provided items need a tombstone; overlay-only items just vanish.
    const isBase = baseItems.some((b) => b.id === id);
    onOverlayChange({
      items: nextItems,
      deleted: isBase ? [...new Set([...overlay.deleted, id])] : overlay.deleted,
    });
  };

  if (mode === "edit") {
    return (
      <EditForm
        initial={editing}
        usedIds={usedIds}
        existingTitles={items.filter((i) => i.id !== editing?.id).map((i) => i.faultTitle)}
        onCancel={() => setMode("list")}
        onSave={(it) => {
          upsert(it);
          setMode("list");
        }}
      />
    );
  }

  if (mode === "import") {
    return (
      <ImportView
        usedIds={usedIds}
        existingTitles={items.map((i) => i.faultTitle)}
        onCancel={() => setMode("list")}
        onImport={(accepted) => {
          const map = { ...overlay.items };
          for (const it of accepted) map[it.id] = it;
          onOverlayChange({
            items: map,
            deleted: overlay.deleted.filter((d) => !accepted.some((a) => a.id === d)),
          });
          setMode("list");
        }}
      />
    );
  }

  const chapters = computeChapters(baseChapters, items);
  const chaptersWithData = chapters.filter((c) => c.count > 0);

  return (
    <div>
      <ScreenHeader title="Quản lý dữ liệu" subtitle={`${items.length} mục · Admin`} onBack={onBack} />

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setMode("edit");
          }}
          className="flex-1 rounded-lg bg-bamboo-green py-2.5 text-sm font-bold text-ink-900"
        >
          + Thêm mục
        </button>
        <button
          type="button"
          onClick={() => setMode("import")}
          className="flex-1 rounded-lg border border-line-soft bg-ink-800 py-2.5 text-sm font-semibold text-gray-200 hover:bg-ink-700"
        >
          Import JSON
        </button>
      </div>

      {/* Export */}
      <div className="mb-3 rounded-xl border border-line-soft bg-ink-800 p-3">
        <p className="mb-2 text-xs font-semibold text-gray-300">Export (để commit vào <code>public/data/reset/</code>)</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              download(
                "index.json",
                JSON.stringify(
                  {
                    aircraftType: "A320 Family",
                    generatedAt: new Date().toISOString().slice(0, 10),
                    totalItems: items.length,
                    chapters,
                  },
                  null,
                  2
                )
              )
            }
            className="rounded-lg border border-line-soft bg-ink-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-ink-600"
          >
            index.json
          </button>
          {chaptersWithData.map((c) => (
            <button
              key={c.ataNumber}
              type="button"
              onClick={() =>
                download(
                  `ata-${c.ataNumber}.json`,
                  JSON.stringify(
                    {
                      ataNumber: c.ataNumber,
                      ataTitle: c.ataTitle,
                      items: items.filter((i) => i.ataChapter === c.ataNumber),
                    },
                    null,
                    2
                  )
                )
              }
              className="rounded-lg border border-line-soft bg-ink-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-ink-600"
            >
              ata-{c.ataNumber}.json
            </button>
          ))}
        </div>
        {hasOverlay(overlay) && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Xóa toàn bộ chỉnh sửa cục bộ (overlay) trên máy này?")) {
                onOverlayChange({ items: {}, deleted: [] });
              }
            }}
            className="mt-2 text-[11px] font-semibold text-red-400 hover:text-red-300"
          >
            Hủy tất cả chỉnh sửa cục bộ
          </button>
        )}
      </div>

      <div className="mb-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Tìm mục để sửa…" />
      </div>

      {shown.length === 0 ? (
        <EmptyBox message="Chưa có mục nào. Bấm “Thêm mục” hoặc Import JSON." />
      ) : (
        <div className="space-y-2">
          {shown.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl border border-line-soft bg-ink-800 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{it.faultTitle}</p>
                <p className="text-[11px] text-gray-500">ATA {it.ataChapter} · {it.verifiedStatus}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(it);
                  setMode("edit");
                }}
                className="rounded-lg border border-line-soft px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-ink-700"
              >
                Sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xóa "${it.faultTitle}"?`)) remove(it.id);
                }}
                className="rounded-lg border border-warn-red/40 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-warn-red/10"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / edit form
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-300">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[10px] text-gray-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "min16 w-full rounded-lg border border-line bg-ink-700 p-2.5 text-base text-white placeholder:text-gray-500 focus:border-bamboo-green focus:outline-none";

function EditForm({
  initial,
  usedIds,
  existingTitles,
  onCancel,
  onSave,
}: {
  initial: ResetFaultItem | null;
  usedIds: Set<string>;
  existingTitles: string[];
  onCancel: () => void;
  onSave: (item: ResetFaultItem) => void;
}) {
  const [faultTitle, setFaultTitle] = useState(initial?.faultTitle ?? "");
  const [ataChapter, setAtaChapter] = useState(initial?.ataChapter ?? "");
  const [ataTitle, setAtaTitle] = useState(initial?.ataTitle ?? "");
  const [system, setSystem] = useState(initial?.system ?? "");
  const [verifiedStatus, setVerifiedStatus] = useState(initial?.verifiedStatus ?? "pending");
  const [config, setConfig] = useState(arrayToLines(initial?.aircraftConfigurationPriorToReset));
  const [cbs, setCbs] = useState(initial?.circuitBreakersToReset ?? []);
  const [steps, setSteps] = useState(arrayToLines(initial?.stepsToClearWarning));
  const [resetDuration, setResetDuration] = useState(initial?.resetDuration ?? "");
  const [pass, setPass] = useState(initial?.results.pass ?? "");
  const [fail, setFail] = useState(initial?.results.fail ?? "");
  const [notes, setNotes] = useState(arrayToLines(initial?.notes));
  const [signOffRefs, setSignOffRefs] = useState(arrayToLines(initial?.signOffRefs));
  const [deferrals, setDeferrals] = useState(arrayToLines(initial?.applicableDeferrals));
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [sourceRef, setSourceRef] = useState(initial?.sourceRef ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  const dupTitle =
    !initial &&
    existingTitles.some((t) => t.trim().toLowerCase() === faultTitle.trim().toLowerCase());

  const handleSave = () => {
    const id =
      initial?.id ??
      uniqueSlug(faultTitle, new Set([...usedIds]));
    const raw: unknown = {
      id,
      aircraftType: initial?.aircraftType ?? "A320 Family",
      ataChapter: ataChapter.trim(),
      ataTitle: ataTitle.trim(),
      faultTitle: faultTitle.trim(),
      system: system.trim() || undefined,
      aircraftConfigurationPriorToReset: linesToArray(config),
      circuitBreakersToReset: cbs.filter((c) => c.label || c.panel || c.number),
      stepsToClearWarning: linesToArray(steps),
      resetDuration: resetDuration.trim() || undefined,
      results: { pass: pass.trim() || undefined, fail: fail.trim() || undefined },
      notes: linesToArray(notes),
      signOffRefs: linesToArray(signOffRefs),
      applicableDeferrals: linesToArray(deferrals),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      sourceRef: sourceRef.trim() || undefined,
      verifiedStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    const r = validateFaultItem(raw);
    if (!r.ok || !r.value) {
      setErrors(r.errors);
      return;
    }
    onSave(r.value);
  };

  const setCb = (i: number, key: "label" | "panel" | "number" | "note", val: string) =>
    setCbs((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)));

  return (
    <div>
      <ScreenHeader
        title={initial ? "Sửa mục" : "Thêm mục"}
        subtitle={faultTitle ? slugify(faultTitle) : "id sẽ tạo từ tiêu đề"}
        onBack={onCancel}
      />

      {errors.length > 0 && (
        <div className="mb-3 rounded-xl border border-warn-red/50 bg-warn-red/10 p-3 text-xs text-red-200">
          <p className="mb-1 font-bold">Không lưu được:</p>
          <ul className="list-disc pl-4">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      {dupTitle && (
        <div className="mb-3 rounded-xl border border-warn-orange/50 bg-warn-orange/10 p-2 text-xs text-amber-200">
          ⚠️ Đã có mục cùng tiêu đề. Kiểm tra lại để tránh trùng.
        </div>
      )}

      <div className="space-y-3">
        <Field label="Fault title *">
          <input className={inputCls} value={faultTitle} onChange={(e) => setFaultTitle(e.target.value)} placeholder="AUTO FLT - RUDDER TRIM 1(2) FAULT" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ATA Chapter *"><input className={inputCls} value={ataChapter} onChange={(e) => setAtaChapter(e.target.value)} placeholder="22" /></Field>
          <Field label="ATA Title"><input className={inputCls} value={ataTitle} onChange={(e) => setAtaTitle(e.target.value)} placeholder="Auto Flight" /></Field>
        </div>
        <Field label="System"><input className={inputCls} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="Rudder Trim / FAC" /></Field>

        <Field label="Verified status">
          <div className="grid grid-cols-3 gap-2">
            {(["pending", "needs_review", "verified"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setVerifiedStatus(s)}
                className={`rounded-lg border py-2 text-xs font-semibold ${
                  verifiedStatus === s
                    ? "border-bamboo-green bg-bamboo-green/15 text-bamboo-green"
                    : "border-line-soft bg-ink-800 text-gray-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Aircraft configuration prior to reset" hint="Mỗi dòng = 1 mục">
          <textarea className={inputCls} rows={2} value={config} onChange={(e) => setConfig(e.target.value)} />
        </Field>

        {/* Circuit breakers */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">Circuit breakers</span>
            <button type="button" onClick={() => setCbs((p) => [...p, { label: "", panel: "", number: "" }])} className="text-xs font-semibold text-bamboo-green">+ Thêm CB</button>
          </div>
          <div className="space-y-2">
            {cbs.map((c, i) => (
              <div key={i} className="rounded-lg border border-line-soft bg-ink-800 p-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <input className={inputCls} value={c.label} onChange={(e) => setCb(i, "label", e.target.value)} placeholder="Label" />
                  <input className={inputCls} value={c.panel} onChange={(e) => setCb(i, "panel", e.target.value)} placeholder="Panel" />
                  <input className={inputCls} value={c.number} onChange={(e) => setCb(i, "number", e.target.value)} placeholder="Number" />
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <input className={inputCls} value={c.note ?? ""} onChange={(e) => setCb(i, "note", e.target.value)} placeholder="Note (tùy chọn)" />
                  <button type="button" onClick={() => setCbs((p) => p.filter((_, idx) => idx !== i))} className="shrink-0 rounded-lg border border-warn-red/40 px-3 text-xs font-semibold text-red-300">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label="Steps to clear warning" hint="Mỗi dòng = 1 bước"><textarea className={inputCls} rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} /></Field>
        <Field label="Reset duration"><input className={inputCls} value={resetDuration} onChange={(e) => setResetDuration(e.target.value)} placeholder="90 seconds." /></Field>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Result — Pass"><input className={inputCls} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Fault messages disappear." /></Field>
          <Field label="Result — Fail"><input className={inputCls} value={fail} onChange={(e) => setFail(e.target.value)} placeholder="Message remains." /></Field>
        </div>
        <Field label="Notes" hint="Mỗi dòng = 1 mục"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="Sign off / AMM refs" hint="Mỗi dòng = 1 ref"><textarea className={inputCls} rows={2} value={signOffRefs} onChange={(e) => setSignOffRefs(e.target.value)} /></Field>
        <Field label="Applicable deferrals / MEL" hint="Mỗi dòng = 1 ref"><textarea className={inputCls} rows={2} value={deferrals} onChange={(e) => setDeferrals(e.target.value)} /></Field>
        <Field label="Tags" hint="Ngăn cách bằng dấu phẩy"><input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AUTO FLT, FAC" /></Field>
        <Field label="Source ref"><input className={inputCls} value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="AMM ref / doc / url" /></Field>
      </div>

      <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-line-soft bg-ink-900/95 py-3 backdrop-blur">
        <button type="button" onClick={handleSave} className="flex-1 rounded-lg bg-bamboo-green py-3 text-sm font-bold text-ink-900">Lưu</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line-soft px-4 py-3 text-sm font-semibold text-gray-300">Hủy</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import JSON
// ---------------------------------------------------------------------------

function ImportView({
  usedIds,
  existingTitles,
  onCancel,
  onImport,
}: {
  usedIds: Set<string>;
  existingTitles: string[];
  onCancel: () => void;
  onImport: (accepted: ResetFaultItem[]) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    valid: ResetFaultItem[];
    invalid: { index: number; errors: string[] }[];
    duplicates: string[];
  } | null>(null);

  const preview = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setResult({ valid: [], invalid: [{ index: -1, errors: [`JSON không hợp lệ: ${(e as Error).message}`] }], duplicates: [] });
      return;
    }
    // Accept either a raw array or a { items: [...] } chapter file.
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { items?: unknown }).items ?? parsed;
    const v = validateFaultItems(list);
    // Assign ids where missing + detect duplicate titles.
    const used = new Set([...usedIds]);
    const duplicates: string[] = [];
    const valid = v.valid.map((it) => {
      const id = it.id && it.id.trim() ? it.id : uniqueSlug(it.faultTitle, used);
      used.add(id);
      if (existingTitles.some((t) => t.trim().toLowerCase() === it.faultTitle.trim().toLowerCase())) {
        duplicates.push(it.faultTitle);
      }
      return { ...it, id };
    });
    setResult({ valid, invalid: v.invalid, duplicates });
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div>
      <ScreenHeader title="Import JSON" subtitle="Preview trước khi nhận" onBack={onCancel} />
      <p className="mb-2 text-xs text-gray-400">
        Dán một mảng JSON các fault item, hoặc chọn file. Dữ liệu được validate;
        record thiếu <code>faultTitle</code>/<code>ataChapter</code> sẽ bị loại.
      </p>

      <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="mb-2 block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-200" />

      <textarea className={inputCls} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder='[ { "faultTitle": "...", "ataChapter": "22", ... } ]' />

      <div className="mt-2 flex gap-2">
        <button type="button" onClick={preview} className="flex-1 rounded-lg border border-line-soft bg-ink-800 py-2.5 text-sm font-semibold text-gray-200">Preview / Validate</button>
      </div>

      {result && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-line-soft bg-ink-800 p-3 text-xs">
            <p className="text-bamboo-green">✓ Hợp lệ: {result.valid.length}</p>
            <p className="text-red-300">✗ Lỗi: {result.invalid.length}</p>
            {result.duplicates.length > 0 && (
              <p className="text-amber-300">⚠ Trùng tiêu đề: {result.duplicates.length} ({result.duplicates.slice(0, 3).join("; ")}{result.duplicates.length > 3 ? "…" : ""})</p>
            )}
          </div>
          {result.invalid.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-warn-red/40 bg-warn-red/5 p-3 text-[11px] text-red-200">
              {result.invalid.map((iv, i) => (
                <p key={i}>#{iv.index}: {iv.errors.join("; ")}</p>
              ))}
            </div>
          )}
          {result.valid.length > 0 && (
            <button type="button" onClick={() => onImport(result.valid)} className="w-full rounded-lg bg-bamboo-green py-3 text-sm font-bold text-ink-900">
              Nhận {result.valid.length} mục hợp lệ vào dữ liệu
            </button>
          )}
        </div>
      )}
    </div>
  );
}
