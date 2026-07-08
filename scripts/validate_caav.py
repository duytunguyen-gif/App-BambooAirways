"""
Validate the parsed CAAV question banks and produce a report for manual review.

Writes:
    scripts/caav_validation_report.md    human-readable summary + issue list
    scripts/caav_validation_report.json  machine-readable version

Run from the project root:   python scripts/validate_caav.py
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from caav_parse_lib import parse_file, FILE_META  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "caav")
OUT_MD = os.path.join(os.path.dirname(__file__), "caav_validation_report.md")
OUT_JSON = os.path.join(os.path.dirname(__file__), "caav_validation_report.json")


def norm(text):
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def main():
    all_q = []
    per_file = {}
    for fname in FILE_META:
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            per_file[fname] = {"missing_file": True}
            continue
        qs = parse_file(path, fname)
        per_file[fname] = qs
        all_q.extend(qs)

    # ---- aggregate counts -------------------------------------------------
    by_status = Counter(q["parseStatus"] for q in all_q)
    by_crs = Counter(q["crs"] for q in all_q)
    by_section = Counter(q["sectionType"] for q in all_q)
    by_engine = Counter(q["engineType"] for q in all_q if q["engineType"])
    ok_answers = sum(1 for q in all_q if q["answerSource"] == "yellow_highlight")

    # duplicates within the same bank (same normalised question + options)
    dup_groups = defaultdict(list)
    for q in all_q:
        sig = (q["sourceFile"], norm(q["question"]),
               tuple(norm(o["text"]) for o in q["options"]))
        dup_groups[sig].append(q["id"])
    duplicates = {k: v for k, v in dup_groups.items() if len(v) > 1}

    # issues needing manual review
    issues = []
    for q in all_q:
        if q["parseStatus"] != "ok":
            issues.append({
                "sourceFile": q["sourceFile"],
                "id": q["id"],
                "questionNumberOriginal": q["questionNumberOriginal"],
                "ata": q["ataCode"],
                "question": q["question"][:120],
                "problem": q["parseStatus"],
                "options": len(q["options"]),
                "hint": {
                    "missing_answer": "Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.",
                    "multi_answer": "File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.",
                    "missing_options": "Thiếu đáp án — kiểm tra layout câu này.",
                    "missing_question": "Thiếu nội dung câu hỏi.",
                }.get(q["parseStatus"], "Kiểm tra thủ công."),
            })

    # ---- per file table ---------------------------------------------------
    file_rows = []
    for fname, qs in per_file.items():
        if isinstance(qs, dict) and qs.get("missing_file"):
            file_rows.append({"file": fname, "missing": True})
            continue
        ok = sum(1 for q in qs if q["parseStatus"] == "ok")
        file_rows.append({
            "file": fname,
            "stated": FILE_META[fname]["stated"],
            "parsed": len(qs),
            "ok": ok,
            "missing_answer": sum(1 for q in qs if q["parseStatus"] == "missing_answer"),
            "multi_answer": sum(1 for q in qs if q["parseStatus"] == "multi_answer"),
            "missing_options": sum(1 for q in qs if q["parseStatus"] == "missing_options"),
            "no_ref": sum(1 for q in qs if not q["ref"]),
            "ata_heads": len({q["ataCode"] for q in qs if q["ataCode"]}),
        })

    report = {
        "totals": {
            "questions": len(all_q),
            "byStatus": dict(by_status),
            "byCRS": dict(by_crs),
            "bySection": dict(by_section),
            "byEngine": dict(by_engine),
            "answersFromYellow": ok_answers,
            "duplicateGroups": len(duplicates),
        },
        "files": file_rows,
        "issues": issues,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    # ---- markdown ---------------------------------------------------------
    L = []
    L.append("# Báo cáo kiểm tra dữ liệu CAAV\n")
    L.append(f"- **Tổng câu parse được:** {len(all_q)}")
    L.append(f"- **Đọc được đáp án từ ô vàng (dùng được cho Test/Thi):** {by_status.get('ok', 0)}")
    L.append(f"- **Thiếu đáp án (missing_answer):** {by_status.get('missing_answer', 0)}")
    L.append(f"- **Bôi vàng >1 đáp án (multi_answer):** {by_status.get('multi_answer', 0)}")
    L.append(f"- **Thiếu option:** {by_status.get('missing_options', 0)}")
    L.append(f"- **Nhóm câu trùng lặp:** {len(duplicates)}\n")

    L.append("## Theo CRS")
    for k, v in by_crs.items():
        L.append(f"- {k}: {v}")
    L.append("\n## Theo nhóm (sectionType)")
    for k, v in by_section.items():
        L.append(f"- {k}: {v}")
    L.append("\n## Theo động cơ")
    for k, v in by_engine.items():
        L.append(f"- {k}: {v}")

    L.append("\n## Theo từng file\n")
    L.append("| File | Tên nêu | Parse | OK | Thiếu ĐA | Multi | Thiếu opt | ATA |")
    L.append("|------|--------:|------:|---:|--------:|------:|---------:|----:|")
    for r in file_rows:
        if r.get("missing"):
            L.append(f"| {r['file'][:34]} | — | **THIẾU FILE** | | | | | |")
            continue
        L.append(f"| {r['file'][:34]} | {r['stated']} | {r['parsed']} | {r['ok']} | "
                 f"{r['missing_answer']} | {r['multi_answer']} | {r['missing_options']} | {r['ata_heads']} |")

    L.append(f"\n## Câu cần kiểm tra thủ công ({len(issues)})\n")
    L.append("Các câu dưới đây **không** được đưa vào Test Bank / Thi Thử cho tới khi xác nhận.\n")
    for it in issues[:400]:
        L.append(f"- `{it['sourceFile'][:26]}` Q{it['questionNumberOriginal']} "
                 f"[{it['problem']}] {it['question'][:70]} — {it['hint']}")
    if len(issues) > 400:
        L.append(f"\n… và {len(issues) - 400} câu nữa (xem file JSON).")

    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(L))

    print("Validation report written:")
    print(" ", OUT_MD)
    print(" ", OUT_JSON)
    print(f"\nTotal {len(all_q)} | ok {by_status.get('ok',0)} | "
          f"missing {by_status.get('missing_answer',0)} | multi {by_status.get('multi_answer',0)} | "
          f"dup groups {len(duplicates)}")


if __name__ == "__main__":
    main()
