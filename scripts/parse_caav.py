"""
Build the CAAV question data for the web app.

Reads every PDF in caav/ and writes:
    public/data/caav/<slug>.json   one file per bank (array of questions)
    public/data/caav/index.json    bank catalogue + stats + exam config

Run from the project root:   python scripts/parse_caav.py
The PDFs stay in caav/ (source of truth); JSON is regenerated any time.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from caav_parse_lib import parse_file, FILE_META, FILE_SLUG  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "caav")
OUT_DIR = os.path.join(ROOT, "public", "data", "caav")

# Real CAAV renewal exam structure.
EXAM_CONFIG = {
    "A":  {"lawQuestions": 15, "typeEngineQuestions": 55, "totalQuestions": 70,  "passPercent": 75},
    "B1": {"lawQuestions": 20, "typeEngineQuestions": 80, "totalQuestions": 100, "passPercent": 75},
    "B2": {"lawQuestions": 20, "typeEngineQuestions": 80, "totalQuestions": 100, "passPercent": 75},
}

# Human labels for the display groups.
CRS_LABEL = {"A": "CRS A", "B1": "CRS B1", "B2": "CRS B2"}


def ata_summary(questions):
    """Ordered list of {code,title,count} for the ATA/topic groups in a bank."""
    order = []
    seen = {}
    for q in questions:
        code = q["ataCode"] or "GEN"
        if code not in seen:
            seen[code] = {"code": q["ataCode"], "title": q["ataTitle"], "count": 0}
            order.append(code)
        seen[code]["count"] += 1
    return [seen[c] for c in order]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    banks = []
    grand_total = 0

    for fname, meta in FILE_META.items():
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print(f"  !! missing file, skipped: {fname}")
            continue
        questions = parse_file(path, fname)
        slug = FILE_SLUG[fname]

        # write the per-bank question file
        with open(os.path.join(OUT_DIR, f"{slug}.json"), "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=1)

        n_ok = sum(1 for q in questions if q["parseStatus"] == "ok")
        n_missing = sum(1 for q in questions if q["parseStatus"] == "missing_answer")
        n_multi = sum(1 for q in questions if q["parseStatus"] == "multi_answer")
        n_other = len(questions) - n_ok - n_missing - n_multi
        grand_total += len(questions)

        banks.append({
            "slug": slug,
            "sourceFile": fname,
            "crs": meta["crs"],
            "cat": meta["cat"],
            "aircraftType": meta["aircraft"],
            "engineType": meta["engine"],
            "sectionType": meta["section"],
            "stated": meta["stated"],
            "total": len(questions),
            "okCount": n_ok,
            "missingAnswerCount": n_missing,
            "multiAnswerCount": n_multi,
            "otherIssueCount": n_other,
            "ataGroups": ata_summary(questions),
        })
        print(f"  {slug:10} {len(questions):4} q  ({n_ok} ok, {n_missing} missing, {n_multi} multi)")

    # CRS display groups: engine/airframe banks for that CRS + shared LAW/English.
    shared = [b["slug"] for b in banks if b["crs"] == "ALL"]
    crs_groups = {}
    for crs in ("A", "B1", "B2"):
        own = [b["slug"] for b in banks if b["crs"] == crs]
        crs_groups[crs] = {"label": CRS_LABEL[crs], "banks": own + shared}

    index = {
        "generatedFrom": "caav/*.pdf",
        "totalQuestions": grand_total,
        "examConfig": EXAM_CONFIG,
        "crsGroups": crs_groups,
        "banks": banks,
    }
    with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)

    print(f"\nWrote {len(banks)} banks + index.json to {OUT_DIR}")
    print(f"Total questions: {grand_total}")


if __name__ == "__main__":
    main()
