"""
Core parsing library for CAAV question banks.

Reads the yellow-highlighted PDFs in caav/ using PyMuPDF and turns them into
structured question objects. The correct answer is ONLY taken from the yellow
highlight rectangle (RGB 1,1,0). We never guess.

Used by scripts/parse_caav.py (builds JSON) and scripts/validate_caav.py.
"""
import re
import fitz  # PyMuPDF


# ---------------------------------------------------------------------------
# File metadata. crs/cat/aircraft/engine/section are known from the filename.
# "ALL" crs means the bank is shared across every CRS (Law + English).
# ---------------------------------------------------------------------------
FILE_META = {
    "1. A320 Airfame CAT A (420 Questions) R01.pdf":
        dict(crs="A",  cat="CAT A",  aircraft="A320", engine=None,      section="TypeEngine", stated=420),
    "2. A320 Airfame CAT B1 (620Questions) R01.pdf":
        dict(crs="B1", cat="CAT B1", aircraft="A320", engine=None,      section="TypeEngine", stated=620),
    "3. A320 Airfame CAT B2 (620Questions) R01.pdf":
        dict(crs="B2", cat="CAT B2", aircraft="A320", engine=None,      section="TypeEngine", stated=620),
    "4. CFM56 Engine CAT A (66 Questions) R01.pdf":
        dict(crs="A",  cat="CAT A",  aircraft="A320", engine="CFM56",   section="TypeEngine", stated=66),
    "5. CFM56 Engine CAT B1 (135 Questions) R01.pdf":
        dict(crs="B1", cat="CAT B1", aircraft="A320", engine="CFM56",   section="TypeEngine", stated=135),
    "6. CFM56 Engine CAT B2 (105 Questions) R01.pdf":
        dict(crs="B2", cat="CAT B2", aircraft="A320", engine="CFM56",   section="TypeEngine", stated=105),
    "7. LEAP-1A Engine  CAT A (50 Questions) R01.pdf":
        dict(crs="A",  cat="CAT A",  aircraft="A320", engine="LEAP-1A", section="TypeEngine", stated=50),
    "8. LEAP-1A Engine  CAT B1 (100 Questions) R01.pdf":
        dict(crs="B1", cat="CAT B1", aircraft="A320", engine="LEAP-1A", section="TypeEngine", stated=100),
    "9. LEAP-1A Engine  CAT B2 (50 Questions) R01.pdf":
        dict(crs="B2", cat="CAT B2", aircraft="A320", engine="LEAP-1A", section="TypeEngine", stated=50),
    "10. V2500 Engine CAT A (50 Questions) R01.pdf":
        dict(crs="A",  cat="CAT A",  aircraft="A320", engine="V2500",   section="TypeEngine", stated=50),
    "11. V2500 Engine CAT B1 (100 Questions) R01.pdf":
        dict(crs="B1", cat="CAT B1", aircraft="A320", engine="V2500",   section="TypeEngine", stated=100),
    "12. V2500 Engine CAT B2 (100 Questions) R01.pdf":
        dict(crs="B2", cat="CAT B2", aircraft="A320", engine="V2500",   section="TypeEngine", stated=100),
    "Aviation Legislation - Question Bank R01.pdf":
        dict(crs="ALL", cat=None,    aircraft=None,   engine=None,      section="LAW",     stated=None),
    "Aviation Technical English Bank rev1.pdf":
        dict(crs="ALL", cat=None,    aircraft=None,   engine=None,      section="English", stated=None),
}

# short slug used to build stable question ids
FILE_SLUG = {
    "1. A320 Airfame CAT A (420 Questions) R01.pdf":       "a320-a",
    "2. A320 Airfame CAT B1 (620Questions) R01.pdf":       "a320-b1",
    "3. A320 Airfame CAT B2 (620Questions) R01.pdf":       "a320-b2",
    "4. CFM56 Engine CAT A (66 Questions) R01.pdf":        "cfm56-a",
    "5. CFM56 Engine CAT B1 (135 Questions) R01.pdf":      "cfm56-b1",
    "6. CFM56 Engine CAT B2 (105 Questions) R01.pdf":      "cfm56-b2",
    "7. LEAP-1A Engine  CAT A (50 Questions) R01.pdf":     "leap-a",
    "8. LEAP-1A Engine  CAT B1 (100 Questions) R01.pdf":   "leap-b1",
    "9. LEAP-1A Engine  CAT B2 (50 Questions) R01.pdf":    "leap-b2",
    "10. V2500 Engine CAT A (50 Questions) R01.pdf":       "v2500-a",
    "11. V2500 Engine CAT B1 (100 Questions) R01.pdf":     "v2500-b1",
    "12. V2500 Engine CAT B2 (100 Questions) R01.pdf":     "v2500-b2",
    "Aviation Legislation - Question Bank R01.pdf":        "law",
    "Aviation Technical English Bank rev1.pdf":            "english",
}


# ---------------------------------------------------------------------------
# Line-level extraction
# ---------------------------------------------------------------------------
# Option markers may be upper/lower case, use "." or ")", have the text on the
# same line or on the following line(s), and may omit the space after the dot.
OPT_DOT   = re.compile(r"^\s*([A-Da-d])\.\s*(.*)$")
OPT_PAREN = re.compile(r"^\s*([A-Da-d])\)\s*(.*)$")
Q_START   = re.compile(r"^\s*(\d{1,3})[.)]\s*(.*)$")   # question number, space optional
ATA_HEAD  = re.compile(r"\bATA\s*[- ]?\s*(\d{1,3})\b", re.I)
# A reference / task / AMM citation line (used to close an option block).
REF_LINE  = re.compile(
    r"^\s*(ref\b|task\b|safety\b|note\b|d\.?o\.?\b|amm\b|\(?\d{2}-\d{2}-\d{2})",
    re.I,
)

# running headers / footers to drop
NOISE = re.compile(
    r"(QUESTION BANK|TYPE RATING|Page\s+\d+\s+of\s+\d+|Revision number|^\s*Rev\.\s|"
    r"MAINTENANCE CENTRE|Aviation Technical English\s*$)",
    re.I,
)


def _is_yellow(fill):
    return (fill and round(fill[0], 1) == 1.0
            and round(fill[1], 1) == 1.0 and round(fill[2], 1) == 0.0)


def extract_lines(doc):
    """Return a flat list of line dicts across all pages (skipping the cover).

    Each line: {text, y0, y1, bold, size, hl (bool)}  where hl means the line
    is covered by a yellow highlight rectangle.
    """
    lines = []
    for pidx in range(doc.page_count):
        page = doc[pidx]
        # collect yellow rects on this page
        yrects = [d["rect"] for d in page.get_drawings() if _is_yellow(d.get("fill"))]
        td = page.get_text("dict")
        for b in td["blocks"]:
            for l in b.get("lines", []):
                spans = l.get("spans", [])
                text = "".join(s["text"] for s in spans).rstrip()
                if not text.strip():
                    continue
                if NOISE.search(text):
                    continue
                y0, y1 = l["bbox"][1], l["bbox"][3]
                h = max(y1 - y0, 1)
                # a line counts as highlighted only if a yellow rect vertically
                # covers a real fraction of it (avoids catching a neighbour line)
                hl = any(
                    (min(y1, r.y1) - max(y0, r.y0)) / h > 0.35 for r in yrects
                )
                s0 = spans[0]
                lines.append(dict(
                    text=text,
                    y0=y0, y1=y1,
                    bold=bool(s0["flags"] & 16),
                    size=round(s0["size"], 1),
                    hl=hl,
                    page=pidx + 1,
                ))
    return lines


def detect_opt_style(lines):
    """Return the dominant option marker regex for this file."""
    dot = sum(1 for l in lines if OPT_DOT.match(l["text"]))
    par = sum(1 for l in lines if OPT_PAREN.match(l["text"]))
    return OPT_PAREN if par > dot else OPT_DOT


def clean(text):
    # normalise the odd encoding artefacts (e.g. the stray "�" seen for "-")
    return re.sub(r"\s+", " ", text.replace("�", "-")).strip()


def parse_file(path, fname):
    """Parse a single PDF into a list of question dicts."""
    meta = FILE_META[fname]
    slug = FILE_SLUG[fname]
    doc = fitz.open(path)
    lines = extract_lines(doc)
    opt_re = detect_opt_style(lines)

    questions = []
    cur = None
    cur_opt = None          # current option key being appended to
    ata_code = None
    ata_title = None

    def push():
        nonlocal cur
        if cur and cur["options"]:
            questions.append(cur)
        cur = None

    for l in lines:
        text = l["text"]

        # -- ATA heading (only meaningful when it is NOT itself a question) --
        m_ata = ATA_HEAD.search(text)
        if m_ata and not opt_re.match(text) and len(text) < 80 and not REF_LINE.match(text):
            # A heading line, e.g. "ATA 09 TOWING & TAXIING"
            push()
            ata_code = "ATA " + m_ata.group(1).zfill(2)
            title = ATA_HEAD.sub("", text).strip(" -:.–")
            ata_title = clean(title) or None
            cur_opt = None
            continue

        # -- option line (marker may sit alone; text on following lines) --
        m_opt = opt_re.match(text)
        if m_opt and cur is not None:
            key = m_opt.group(1).upper()
            body = m_opt.group(2)
            cur["options"].append({"key": key, "text": clean(body), "hl": l["hl"]})
            cur_opt = cur["options"][-1]
            continue

        # -- ref line (closes the current option block) --
        if cur is not None and cur["options"] and REF_LINE.match(text):
            cur["ref"] = clean((cur.get("ref", "") + " " + text).strip())
            cur_opt = None
            continue

        # -- question start --
        m_q = Q_START.match(text)
        if m_q and not m_opt:
            push()
            cur = dict(
                qnum=int(m_q.group(1)),
                stem=clean(m_q.group(2)),
                options=[],
                ref="",
                ata_code=ata_code,
                ata_title=ata_title,
                page=l["page"],
            )
            cur_opt = None
            continue

        # -- continuation line --
        if cur is not None:
            if cur_opt is not None:
                cur_opt["text"] = clean(cur_opt["text"] + " " + text)
                if l["hl"]:
                    cur_opt["hl"] = True
            elif not cur["options"]:
                cur["stem"] = clean(cur["stem"] + " " + text)

    push()

    # -- assemble final records --
    out = []
    for i, q in enumerate(questions, 1):
        keys = [o["key"] for o in q["options"]]
        hl_keys = [o["key"] for o in q["options"] if o["hl"]]
        if len(hl_keys) == 1:
            correct, ans_src, pstatus = hl_keys[0], "yellow_highlight", "ok"
        elif len(hl_keys) == 0:
            correct, ans_src, pstatus = None, "unknown", "missing_answer"
        else:
            correct, ans_src, pstatus = None, "unknown", "multi_answer"

        if len(q["options"]) < 2:
            pstatus = "missing_options"
        if not q["stem"]:
            pstatus = "missing_question"

        ata_part = (q["ata_code"] or "gen").lower().replace(" ", "")
        qid = f"{slug}-{ata_part}-q{q['qnum']:03d}-{i:04d}"

        out.append({
            "id": qid,
            "crs": meta["crs"],
            "cat": meta["cat"],
            "aircraftType": meta["aircraft"],
            "engineType": meta["engine"],
            "sourceFile": fname,
            "sectionType": meta["section"],
            "ataCode": q["ata_code"],
            "ataTitle": q["ata_title"],
            "questionNumberOriginal": q["qnum"],
            "question": q["stem"],
            "options": [{"key": o["key"], "text": o["text"]} for o in q["options"]],
            "correctAnswer": correct,
            "ref": q["ref"] or None,
            "answerSource": ans_src,
            "parseStatus": pstatus,
        })
    return out
