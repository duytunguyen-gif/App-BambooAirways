"""
Core parsing library for CAAV question banks.

Reads the yellow-highlighted PDFs in caav/ using PyMuPDF and turns them into
structured question objects. The correct answer is ONLY taken from the yellow
highlight rectangle (RGB 1,1,0). We never guess.

Used by scripts/parse_caav.py (builds JSON) and scripts/validate_caav.py.
"""
import re
from difflib import SequenceMatcher
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
# A reference / task / AMM / source-citation line (closes an option block so the
# trailing source note is not folded into the answer text). Covers e.g.
#   "REF AMM 74-00-00-00 ...", "Page 97 - Technical training manual ...",
#   "T1+T2 (CFM 56) (Lvl 2&3) 46 - INFORMATION SYSTEMS PAGE 26".
REF_LINE  = re.compile(
    r"^\s*(ref\b|task\b|safety\b|note\b|d\.?o\.?\b|amm\b|\(?\d{2}-\d{2}-\d{2}"
    r"|page\s+\d+\b|t\s*\d\s*\+\s*t\s*\d\b)",
    re.I,
)
# Some banks (esp. Aviation Legislation) restate the answer in plain text:
#   "Correct Answer is. <full option text>"   followed by  "Explanation. ..."
CORRECT_LINE = re.compile(r"correct\s+answer\s+is\b", re.I)
EXPL_LINE    = re.compile(r"^\s*explanation\b", re.I)

# running headers / footers to drop
NOISE = re.compile(
    r"(QUESTION BANK|TYPE RATING|Page\s+\d+\s+of\s+\d+|Revision number|^\s*Rev\.\s|"
    r"MAINTENANCE CENTRE|Aviation Technical English\s*$)",
    re.I,
)


def _is_yellow(fill):
    return (fill and round(fill[0], 1) == 1.0
            and round(fill[1], 1) == 1.0 and round(fill[2], 1) == 0.0)


def _word_is_yellow(w, yrects):
    """True when a single word bbox is genuinely covered by yellow (both axes),
    not merely clipped by a highlight on the line above/below."""
    x0, y0, x1, y1 = w[0], w[1], w[2], w[3]
    h = max(y1 - y0, 1)
    wd = max(x1 - x0, 1)
    for r in yrects:
        vy = (min(y1, r.y1) - max(y0, r.y0)) / h
        vx = (min(x1, r.x1) - max(x0, r.x0)) / wd
        if vy > 0.3 and vx > 0.5:
            return True
    return False


def extract_lines(doc):
    """Return a flat list of line dicts across all pages (skipping the cover).

    Each line dict carries, besides the text:
      hl            whether a yellow rect vertically covers the line (legacy)
      nwords        number of words on the line
      nyellow       how many of those words are genuinely yellow
      first_yellow  whether the FIRST word (usually the A./B./C. marker) is yellow
    The per-word counts let us measure how much of an option's *body* text is
    highlighted, which is far more robust than "is any part of the line yellow".
    """
    lines = []
    for pidx in range(doc.page_count):
        page = doc[pidx]
        # collect yellow rects on this page
        yrects = [d["rect"] for d in page.get_drawings() if _is_yellow(d.get("fill"))]
        words = page.get_text("words")  # (x0,y0,x1,y1, word, block, line, wno)
        td = page.get_text("dict")
        for b in td["blocks"]:
            for l in b.get("lines", []):
                spans = l.get("spans", [])
                text = "".join(s["text"] for s in spans).rstrip()
                if not text.strip():
                    continue
                if NOISE.search(text):
                    continue
                bx = l["bbox"]
                y0, y1 = bx[1], bx[3]
                h = max(y1 - y0, 1)
                # a line counts as highlighted only if a yellow rect vertically
                # covers a real fraction of it (avoids catching a neighbour line)
                hl = any(
                    (min(y1, r.y1) - max(y0, r.y0)) / h > 0.35 for r in yrects
                )
                # words that belong to this text line: the word's vertical CENTRE
                # must fall inside the line box (a mere overlap would wrongly grab
                # yellow words from a tightly-spaced neighbouring line).
                lw = [w for w in words
                      if bx[1] - 0.5 <= (w[1] + w[3]) / 2 <= bx[3] + 0.5
                      and w[0] >= bx[0] - 1 and w[2] <= bx[2] + 1]
                lw.sort(key=lambda w: w[0])
                yflags = [_word_is_yellow(w, yrects) for w in lw]
                # is the first word a *pure* option marker ("B." / "B)")? Only then
                # should it be stripped from the body count — a joined "B.Manually"
                # must keep its text.
                first_is_marker = bool(lw and re.fullmatch(r"[A-Da-d][.)]", lw[0][4]))
                s0 = spans[0]
                lines.append(dict(
                    text=text,
                    y0=y0, y1=y1,
                    bold=bool(s0["flags"] & 16),
                    size=round(s0["size"], 1),
                    hl=hl,
                    nwords=len(lw),
                    nyellow=sum(yflags),
                    first_yellow=bool(yflags and yflags[0]),
                    first_is_marker=first_is_marker,
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


def _norm_match(s):
    """Aggressively normalise text for fuzzy answer matching: lowercase, drop
    parentheticals and punctuation so 'are LWTR (licensed...) and...' still
    matches 'are LWTR and...'."""
    s = re.sub(r"\(.*?\)", " ", s.lower())
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def match_correct_line(correct_line, options):
    """Given a 'Correct Answer is. <text>' line, return the option key it names,
    or None when no option is a confident match. Never guesses."""
    body = re.sub(r"(?i).*correct\s+answer\s+is[.: ]*", "", correct_line)
    body = re.split(r"(?i)\bexplanation\b", body)[0]
    nb = _norm_match(body)
    if len(nb) < 2:
        return None
    if re.fullmatch(r"[a-d]", nb):          # "Correct Answer is A"
        return nb.upper()
    scored = []
    for o in options:
        no = _norm_match(o["text"])
        if not no:
            scored.append((0.0, o["key"]))
            continue
        ratio = SequenceMatcher(None, no, nb).ratio()
        ot, bt = set(no.split()), set(nb.split())
        jac = len(ot & bt) / len(ot | bt) if (ot | bt) else 0.0
        scored.append((max(ratio, jac), o["key"]))
    scored.sort(reverse=True)
    best = scored[0]
    second = scored[1] if len(scored) > 1 else (0.0, "")
    if best[0] >= 0.55 and best[0] - second[0] >= 0.1:
        return best[1]
    return None


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
            # body word coverage excludes the leading marker word (its label box
            # is a frequent source of stray yellow bleed) — but only when the
            # marker is a standalone token, not joined to the text ("B.Manually").
            if l["first_is_marker"]:
                body_nw = max(l["nwords"] - 1, 0)
                body_ny = max(l["nyellow"] - (1 if l["first_yellow"] else 0), 0)
            else:
                body_nw = l["nwords"]
                body_ny = l["nyellow"]
            cur["options"].append({
                "key": key, "text": clean(body), "hl": l["hl"],
                "nw": body_nw, "ny": body_ny,
            })
            cur_opt = cur["options"][-1]
            continue

        # -- explicit "Correct Answer is ..." line (restates the answer in text) --
        if cur is not None and CORRECT_LINE.search(text):
            cur["correct_line"] = clean((cur.get("correct_line", "") + " " + text).strip())
            cur_opt = None
            continue

        # -- explanation line closes the block (don't fold it into an option) --
        if cur is not None and EXPL_LINE.match(text):
            cur_opt = None
            continue

        # -- ref line (closes the current option block) --
        # ...but not when the current option was just opened by a bare marker and
        # is still empty: the line is then the option's own text, which may itself
        # look like a citation (e.g. an answer of "AMM 12-31-38.").
        if (cur is not None and cur["options"] and REF_LINE.match(text)
                and (cur_opt is None or cur_opt["text"])):
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
                correct_line="",
                ata_code=ata_code,
                ata_title=ata_title,
                page=l["page"],
            )
            cur_opt = None
            continue

        # -- continuation line --
        if cur is not None:
            if cur.get("correct_line"):
                cur["correct_line"] = clean(cur["correct_line"] + " " + text)
            elif cur_opt is not None:
                cur_opt["text"] = clean(cur_opt["text"] + " " + text)
                cur_opt["nw"] += l["nwords"]
                cur_opt["ny"] += l["nyellow"]
                if l["hl"]:
                    cur_opt["hl"] = True
            elif not cur["options"]:
                cur["stem"] = clean(cur["stem"] + " " + text)

    push()

    # -- assemble final records --
    out = []
    for i, q in enumerate(questions, 1):
        # candidates = options with at least one genuinely-yellow BODY word.
        # _word_is_yellow already demands substantial coverage, so a single such
        # word is a deliberate highlight, while marker/edge bleed nets exactly 0.
        cand = [o["key"] for o in q["options"] if o["ny"] >= 1]
        line_key = (match_correct_line(q["correct_line"], q["options"])
                    if q.get("correct_line") else None)

        # resolution — highlight is primary; the text line confirms or, when there
        # is no highlight at all, provides the answer. Disagreement => excluded.
        if len(cand) == 1:
            if line_key and line_key != cand[0]:
                correct, ans_src, pstatus = None, "conflict", "conflict"
            else:
                correct = cand[0]
                ans_src = "yellow+line" if line_key == cand[0] else "yellow_highlight"
                pstatus = "ok"
        elif len(cand) == 0:
            if line_key:
                correct, ans_src, pstatus = line_key, "correct_line", "ok"
            else:
                correct, ans_src, pstatus = None, "unknown", "missing_answer"
        else:
            # more than one highlighted body — too risky even if a line agrees
            correct, ans_src, pstatus = None, "unknown", "multi_answer"

        if len(q["options"]) < 2:
            pstatus = "missing_options"
        if not q["stem"]:
            pstatus = "missing_question"
        if pstatus != "ok":
            correct = None

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
            "answerNote": None,
            "parseStatus": pstatus,
        })
    return out
