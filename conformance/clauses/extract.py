#!/usr/bin/env python3
"""Extract the clause register from the living Blygger spec.

Reads  docs/protocol-v0.3.md  (or --spec PATH) and writes
  conformance/clauses/clauses.json   — one entry per normative sentence
                                        (RFC 2119 keyword), plus §16 pending
                                        shapes and the section/invariant index.
  conformance/clauses/ids.lock.json  — the fingerprint -> id lock that keeps
                                        clause ids stable across spec edits.

Stdlib only. Run from anywhere:  python3 conformance/clauses/extract.py

How a clause is found
---------------------
The markdown is cut into *blocks* (paragraphs, list items, table rows);
fenced code blocks, headings and HTML comments are dropped. Inline code
spans are masked so keywords and sentence breaks inside backticks are
ignored. Each block is split into sentences; a sentence containing an
uppercase RFC 2119 keyword is a clause. Sections whose heading says
"(non-normative)" are skipped, except §16, whose keyword sentences become
`pending` entries (ruled shapes not yet normative).

How ids stay stable
-------------------
Each clause gets a fingerprint (hash of its normalised text). ids.lock.json
maps id -> fingerprint. On a rerun a clause whose fingerprint is in the lock
keeps its id; a clause whose text changed slightly is matched to a vanished
clause in the same section by similarity (>= 0.80) and keeps that id; a
genuinely new clause gets the next number never used in its section.
Retired ids stay in the lock and are never reused. So ids are "in order
within the section" on first extraction and *append-only* afterwards.
Delete ids.lock.json to renumber from scratch (breaks external references).
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEFAULT_SPEC = REPO / "docs" / "protocol-v0.3.md"

# --- RFC 2119 keywords, grouped into the three levels of decision #48 -------
# MUST family fails, SHOULD family warns, MAY family is shape-checked.
KEYWORDS = [
    ("MUST NOT", "MUST"), ("SHALL NOT", "MUST"), ("MUST", "MUST"),
    ("REQUIRED", "MUST"), ("SHALL", "MUST"),
    ("SHOULD NOT", "SHOULD"), ("NOT RECOMMENDED", "SHOULD"),
    ("SHOULD", "SHOULD"), ("RECOMMENDED", "SHOULD"),
    ("MAY", "MAY"), ("OPTIONAL", "MAY"),
]
KW_RE = re.compile(r"\b(" + "|".join(k for k, _ in KEYWORDS) + r")\b")
LEVEL_OF = dict(KEYWORDS)
LEVEL_RANK = {"MUST": 3, "SHOULD": 2, "MAY": 1}

HEADING_RE = re.compile(r"^(#{1,4})\s+(?:(\d+(?:\.\d+)?[a-z]?)\.?\s+)?(.*?)\s*$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
LIST_RE = re.compile(r"^(\s*)([-*+]|\d+\.)\s+")
TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{2,}")
SECREF_RE = re.compile(r"(?:(\b0\.[0-9])\s+)?§(§?)\s?(\d+(?:\.\d+)*[a-z]?)(?:\s*[–-]\s*(\d+(?:\.\d+)*[a-z]?))?")
DECISION_RE = re.compile(r"(?<![\w-])#(\d{1,2})\b")
CODESPAN_RE = re.compile(r"`[^`\n]*`")
BOLD_LEAD_RE = re.compile(r"^\*\*([^*]{1,80}?[.:])\*\*\s*")
ABBREV = {"e.g", "i.e", "etc", "cf", "vs", "approx", "viz", "al", "fig", "no"}

# Actor words used by the side heuristic. The *last* actor named before the
# first keyword in a sentence is taken as the sentence's subject.
ACTORS = [
    ("receiver", r"receivers?|receiving endpoint|endpoint"),
    ("sender", r"senders?"),
    ("reader", r"readers?|importers?|subscribers?|consumers?|RSS reader"),
    ("client", r"studios?|clients?|authoring tools?"),
    ("publisher", r"publishers?|manifests?|feeds?|item documents?|documents?|"
                  r"files?|entr(?:y|ies)|deployments?|pinned files?|pages?|wrappers?|directives?|"
                  r"`[a-z_]+(?:\[\])?`"),
]
ACTOR_RE = re.compile(r"\b(" + "|".join(f"(?P<{n}>{p})" for n, p in ACTORS) + r")\b", re.I)

# Section -> default side when a sentence names no actor.
SECTION_SIDE = [
    (r"^15\.2$", "sender"), (r"^15\.[3-7]$", "receiver"), (r"^15\.1$", "publisher"),
    (r"^1[23](\.|$)", "reader"),
    (r"^([4-9]|10|11)(\.|$)", "publisher"),
]


def norm(text: str) -> str:
    t = re.sub(r"[*_`]", "", text.lower())
    return re.sub(r"\s+", " ", t).strip()


def fingerprint(text: str) -> str:
    return hashlib.sha1(norm(text).encode()).hexdigest()[:12]


def mask_code(s: str) -> str:
    """Replace inline-code contents with 'x' (same length) so offsets survive."""
    return CODESPAN_RE.sub(lambda m: "`" + "x" * (len(m.group()) - 2) + "`", s)


# ----------------------------------------------------------------------------
# Markdown -> sections and blocks
# ----------------------------------------------------------------------------

def read_sections(lines: list[str]) -> tuple[list[dict], list[dict]]:
    """Return (sections, blocks). Each block knows its section and start line."""
    sections: list[dict] = []
    blocks: list[dict] = []
    cur = {"id": "0", "heading": "Preamble", "depth": 1, "line": 1}
    sections.append(cur)
    in_fence = False
    buf: list[tuple[int, str]] = []
    kind = "para"

    def flush():
        nonlocal buf
        if buf:
            text = " ".join(t.strip() for _, t in buf)
            blocks.append({"section": cur["id"], "line": buf[0][0], "kind": kind,
                           "text": text, "lines": [n for n, _ in buf]})
        buf = []

    for i, raw in enumerate(lines, start=1):
        line = raw.rstrip("\n")
        if FENCE_RE.match(line):
            flush()
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        h = HEADING_RE.match(line)
        if h and line.startswith("#"):
            flush()
            depth, num, title = len(h.group(1)), h.group(2), h.group(3)
            if num and depth >= 2:
                cur = {"id": num, "heading": title, "depth": depth, "line": i}
                sections.append(cur)
            continue
        stripped = line.strip()
        if not stripped or stripped.startswith("<!--") or stripped == "---":
            flush()
            continue
        if stripped.startswith("|"):
            flush()
            if not TABLE_SEP_RE.match(stripped):
                kind = "table"
                buf = [(i, stripped.strip("|").replace("|", " ; "))]
                flush()
            kind = "para"
            continue
        if LIST_RE.match(line):
            flush()
            kind = "list"
            buf = [(i, LIST_RE.sub("", line, count=1))]
            continue
        if stripped.startswith(">"):
            stripped = stripped.lstrip("> ")
        if not buf:
            kind = "para"
        buf.append((i, stripped))
    flush()
    return sections, blocks


def split_sentences(text: str) -> list[tuple[int, int]]:
    """Return (start, end) spans of sentences in `text` (code spans masked)."""
    m = mask_code(text)
    spans, start, depth = [], 0, 0
    i = 0
    while i < len(m):
        c = m[i]
        if c in "([":
            depth += 1
        elif c in ")]":
            depth = max(0, depth - 1)
        elif c in ".!?" and depth == 0:
            j = i + 1
            while j < len(m) and m[j] in "\"'”*_)":
                j += 1
            if j < len(m) and m[j] == " ":
                k = j
                while k < len(m) and m[k] == " ":
                    k += 1
                nxt = m[k] if k < len(m) else ""
                word = re.search(r"([A-Za-z.]+)$", m[start:i])
                prev = (word.group(1).lower().rstrip(".") if word else "")
                if (nxt.isupper() or nxt in "*`(\"“_[") and prev not in ABBREV:
                    spans.append((start, j))
                    start = k
                    i = k
                    continue
        i += 1
    if start < len(m):
        spans.append((start, len(m)))
    return [(a, b) for a, b in spans if m[a:b].strip()]


def section_refs(text: str) -> tuple[list[str], list[str]]:
    """§ references in `text`: (this-version refs, other-version refs like '0.2 §12.2')."""
    refs, ext = [], []
    for m in SECREF_RE.finditer(text):
        ver, double, a, b = m.groups()
        targets = [a]
        if b:  # a range: §§5–11  or §10.1–§10.3 written as §10.1–10.3
            try:
                if "." not in a and "." not in b:
                    targets = [str(n) for n in range(int(a), int(b) + 1)]
                else:
                    targets = [a, b]
            except ValueError:
                targets = [a, b]
        (ext if ver else refs).extend(f"{ver} §{t}" if ver else t for t in targets)
    # "§10.1–§10.3" is two matches already; dedupe preserving order
    return list(dict.fromkeys(refs)), list(dict.fromkeys(ext))


def guess_side(sentence_masked: str, section: str) -> tuple[str, str]:
    # Anchor on the *strongest* keyword: "publishers SHOULD emit it; readers
    # MUST NOT gate on it" is a reader clause for conformance purposes.
    kws = list(KW_RE.finditer(sentence_masked))
    kw = max(kws, key=lambda m: LEVEL_RANK[LEVEL_OF[m.group(1)]]) if kws else None
    prefix = sentence_masked[: kw.start()] if kw else sentence_masked
    hits = list(ACTOR_RE.finditer(prefix))
    if hits:
        last = hits[-1]
        for name, _ in ACTORS:
            if last.group(name):
                return name, f"subject '{last.group(0)}'"
    for pat, side in SECTION_SIDE:
        if re.match(pat, section):
            return side, f"section §{section} default"
    return "unknown", "no actor, no section default"


# ----------------------------------------------------------------------------
# Clause extraction
# ----------------------------------------------------------------------------

def section_mode(sec_id: str, heading: str) -> str:
    top = sec_id.split(".")[0]
    if top == "16":
        return "pending"
    if top in ("0", "17") or "non-normative" in heading.lower():
        return "skip"
    return "normative"


def extract(spec_path: Path, overrides: dict) -> dict:
    lines = spec_path.read_text(encoding="utf-8").splitlines()
    sections, blocks = read_sections(lines)
    sec_by_id = {s["id"]: s for s in sections}
    for s in sections:
        s["mode"] = section_mode(s["id"], s["heading"])

    raw: list[dict] = []
    for b in blocks:
        sec = sec_by_id[b["section"]]
        if sec["mode"] == "skip":
            continue
        text = b["text"]
        masked = mask_code(text)
        label_m = BOLD_LEAD_RE.match(text)
        label = label_m.group(1).rstrip(".:") if label_m else None
        block_decisions = sorted({int(d) for d in DECISION_RE.findall(masked)})
        for a, z in split_sentences(text):
            sent, smask = text[a:z].strip(), masked[a:z]
            kws = [k for k in KW_RE.findall(smask)]
            if not kws:
                continue
            levels = [LEVEL_OF[k] for k in kws]
            level = max(levels, key=LEVEL_RANK.get)
            refs, ext = section_refs(sent)
            side, why = guess_side(smask, b["section"])
            sent_dec = sorted({int(d) for d in DECISION_RE.findall(smask)})
            raw.append({
                "section": b["section"],
                "heading": sec["heading"],
                "status": "normative" if sec["mode"] == "normative" else "pending",
                "level": level,
                "keywords": list(dict.fromkeys(kws)),
                "text": sent,
                "label": label,
                "line": b["line"],
                "block_kind": b["kind"],
                "side": side,
                "side_basis": why,
                "decisions": sent_dec,
                "decisions_nearby": [d for d in block_decisions if d not in sent_dec],
                "refs": refs,
                "ext_refs": ext,
                "tokens": sorted(set(re.findall(r"`([^`\n]{2,40})`", sent))),
                "fp": fingerprint(sent),
            })

    apply_overrides(raw, overrides)
    return {"sections": sections, "clauses": raw, "lines": len(lines)}


def apply_overrides(clauses: list[dict], overrides: dict) -> None:
    """overrides.json 'clauses': [{match, section?, exclude?|set?}] — matched by text."""
    used = set()
    for idx, ov in enumerate(overrides.get("clauses", [])):
        for c in clauses:
            if ov.get("section") and c["section"] != ov["section"]:
                continue
            if ov["match"] not in c["text"]:
                continue
            used.add(idx)
            if "exclude" in ov:
                c["excluded"] = ov["exclude"]
            for k, v in ov.get("set", {}).items():
                c[k] = v
                if k == "side":
                    c["side_basis"] = "override"
    for idx, ov in enumerate(overrides.get("clauses", [])):
        if idx not in used:
            print(f"warning: override matched nothing: {ov['match'][:60]!r}", file=sys.stderr)


# ----------------------------------------------------------------------------
# Stable ids
# ----------------------------------------------------------------------------

def assign_ids(clauses: list[dict], lock: dict) -> dict:
    """Mutates clauses with 'id'; returns the new lock."""
    entries = lock.get("ids", {})
    by_fp = {v["fp"]: k for k, v in entries.items() if not v.get("retired")}
    claimed: set[str] = set()
    # 1. exact fingerprint matches keep their id
    for c in clauses:
        cid = by_fp.get(c["fp"])
        if cid and cid not in claimed and entries[cid]["section"] == c["section"]:
            c["id"] = cid
            claimed.add(cid)
    # 2. near matches (edited text) inherit a vanished id from the same section
    vanished = {k: v for k, v in entries.items() if not v.get("retired") and k not in claimed}
    for c in clauses:
        if "id" in c:
            continue
        best, score = None, 0.80
        for k, v in vanished.items():
            if v["section"] != c["section"] or k in claimed:
                continue
            r = difflib.SequenceMatcher(None, norm(v["text"]), norm(c["text"])).ratio()
            if r >= score:
                best, score = k, r
        if best:
            c["id"] = best
            c["id_basis"] = f"near-match {score:.2f}"
            claimed.add(best)
    # 3. new clauses: next number never used in their section
    high: dict[str, int] = {}
    for k, v in entries.items():
        n = int(k.rsplit("-", 1)[1])
        high[k.rsplit("-", 1)[0]] = max(high.get(k.rsplit("-", 1)[0], 0), n)
    for c in clauses:
        if "id" in c:
            continue
        prefix = ("C-" if c["status"] == "normative" else "P-") + c["section"]
        high[prefix] = high.get(prefix, 0) + 1
        c["id"] = f"{prefix}-{high[prefix]:02d}"
        claimed.add(c["id"])
    new_entries = {}
    for k, v in entries.items():
        if k not in claimed:
            new_entries[k] = {**v, "retired": True}
    for c in clauses:
        new_entries[c["id"]] = {"fp": c["fp"], "section": c["section"], "text": c["text"][:160]}
    return {"note": "Clause id lock — do not hand-edit except to retire ids. See README.",
            "ids": dict(sorted(new_entries.items(), key=lambda kv: id_sort_key(kv[0])))}


def id_sort_key(cid: str):
    _, sec, n = cid.split("-")
    parts = re.findall(r"\d+|[a-z]+", sec)
    return (cid[0], [int(p) if p.isdigit() else p for p in parts], int(n))


# ----------------------------------------------------------------------------
# §16 pending shapes, §2 terminology, §1 invariants
# ----------------------------------------------------------------------------

def pending_shapes(sections: list[dict], lines: list[str]) -> list[dict]:
    out = []
    subs = [s for s in sections if s["id"].startswith("16.")]
    for s in subs:
        h = s["heading"].lower()
        paren = re.search(r"\(([^)]*)\)\s*$", s["heading"])
        status = "ruled"
        if "promoted" in h:
            status = "promoted"
        elif "never" in h:
            status = "never"
        elif "closed" in h or "resolved" in h or "no such thing" in h:
            status = "closed"
        elif "reserved" in h:
            status = "reserved"
        elif "0.4 construct" in h:
            status = "ruled-0.4"
        target = re.search(r"promoted (?:in)?to §([\d.a-z–§]+)", s["heading"])
        out.append({"section": s["id"], "heading": s["heading"], "status": status,
                    "note": paren.group(1) if paren else "",
                    "promoted_to": [t.strip("§") for t in re.split(r"[–]", target.group(1))] if target else [],
                    "line": s["line"]})
    return out


def terminology(sections: list[dict], blocks_text: str) -> list[dict]:
    terms = []
    for m in re.finditer(r"^- \*\*(.+?)\*\* — (.*?)(?=^- \*\*|\Z)", blocks_text, re.M | re.S):
        body = " ".join(m.group(2).split())
        refs, _ = section_refs(body)
        terms.append({"term": m.group(1), "definition": body, "refs": refs})
    return terms


def invariants(intro: str) -> list[dict]:
    out = []
    for m in re.finditer(r"^(\d)\. \*\*(.+?)\*\*(.*?)(?=^\d\. |^The protocol has|\Z)", intro, re.M | re.S):
        body = " ".join((m.group(2) + m.group(3)).split())
        refs, _ = section_refs(body)
        out.append({"id": f"I{m.group(1)}", "title": m.group(2).rstrip("."), "text": body, "refs": refs})
    return out


def section_text(lines: list[str], sections: list[dict], sec_id: str) -> str:
    idx = next(i for i, s in enumerate(sections) if s["id"] == sec_id)
    start = sections[idx]["line"]
    end = sections[idx + 1]["line"] - 1 if idx + 1 < len(sections) else len(lines)
    return "\n".join(lines[start:end])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--spec", type=Path, default=DEFAULT_SPEC)
    ap.add_argument("--out", type=Path, default=HERE / "clauses.json")
    ap.add_argument("--lock", type=Path, default=HERE / "ids.lock.json")
    ap.add_argument("--overrides", type=Path, default=HERE / "overrides.json")
    args = ap.parse_args(argv)

    overrides = json.loads(args.overrides.read_text()) if args.overrides.exists() else {}
    lock = json.loads(args.lock.read_text()) if args.lock.exists() else {}
    data = extract(args.spec, overrides)
    lines = args.spec.read_text(encoding="utf-8").splitlines()
    new_lock = assign_ids(data["clauses"], lock)

    sections = data["sections"]
    counts: dict[str, dict] = {}
    for c in data["clauses"]:
        if c.get("excluded"):
            continue
        d = counts.setdefault(c["section"], {"MUST": 0, "SHOULD": 0, "MAY": 0})
        d[c["level"]] += 1
    for i, s in enumerate(sections):
        end = sections[i + 1]["line"] - 1 if i + 1 < len(sections) else len(lines)
        s["end_line"] = end
        s["n_lines"] = end - s["line"] + 1
        s["counts"] = counts.get(s["id"], {"MUST": 0, "SHOULD": 0, "MAY": 0})
        body = "\n".join(lines[s["line"]:end])
        # lowercase normative-sounding words outside code: possible missed keywords
        body = re.sub(r"```.*?```", "", body, flags=re.S)
        body = CODESPAN_RE.sub("", body)
        s["lowercase_modals"] = len(re.findall(r"\b(must|shall|should|required)\b", body))

    out = {
        "source": str(args.spec.relative_to(REPO)) if args.spec.is_relative_to(REPO) else str(args.spec),
        "spec_lines": data["lines"],
        "invariants": invariants(section_text(lines, sections, "1")),
        "terminology": terminology(sections, section_text(lines, sections, "2")),
        "sections": sections,
        "pending_shapes": pending_shapes(sections, lines),
        "clauses": sorted(data["clauses"], key=lambda c: (c["line"], id_sort_key(c["id"]))),
    }
    args.out.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    args.lock.write_text(json.dumps(new_lock, indent=1, ensure_ascii=False) + "\n")
    live = [c for c in out["clauses"] if not c.get("excluded")]
    by = {}
    for c in live:
        by[(c["status"], c["level"])] = by.get((c["status"], c["level"]), 0) + 1
    print(f"clauses: {len(live)} ({len(out['clauses']) - len(live)} excluded) "
          + ", ".join(f"{s}/{l}={n}" for (s, l), n in sorted(by.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
