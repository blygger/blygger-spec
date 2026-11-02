#!/usr/bin/env python3
"""Parse the locked-decision list (#1–#N) out of the repo's CLAUDE.md.

Writes conformance/clauses/decisions.json:
  number, title (first bold phrase), session, date, by (Fable/Venkat/...),
  spec_sections (§ refs that point at the *spec*, with how we know),
  other_refs (§ refs into plan docs etc., kept for inspection),
  relations (amends / supersedes / ... edges to other decisions),
  mentions (every other #N named), tokens (backticked wire tokens).

Stdlib only:  python3 conformance/clauses/decisions.py
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent

ENTRY_RE = re.compile(r"^(\d{1,3})\.\s+(.*)$")
SEC_RE = re.compile(r"§(\d+(?:\.\d+)*[a-z]?)")
DEC_RE = re.compile(r"(?<![\w-])#(\d{1,2})\b")

# Phrases that make a directed edge between decisions. `forward` means the
# decision containing the phrase points at the one it names
# ("#16 amends #14" -> 16 amends 14); `backward` flips it ("amended by #16"
# written inside #14 -> 16 amends 14).
RELATIONS = [
    (r"reversed by", "reverses", "backward"),
    (r"amended by", "amends", "backward"),
    (r"superseded by", "supersedes", "backward"),
    (r"amends?|amending|amendment to|amendment of", "amends", "forward"),
    (r"supersedes?|replaces", "supersedes", "forward"),
    (r"corrects|correcting", "corrects", "forward"),
    (r"resolves|closes", "resolves", "forward"),
    (r"extends", "extends", "forward"),
    (r"confirms|reaffirm\w*", "confirms", "forward"),
    (r"gives|refines", "refines", "forward"),
    (r"reverses|reversing", "reverses", "forward"),
]
REL_RE = re.compile(r"\b(" + "|".join(f"(?P<r{i}>{p})" for i, (p, _, _) in enumerate(RELATIONS)) + r")\b"
                    r"(?P<mid>(?:[^.;:#]|\.\d){0,50}?)(?P<nums>(?:#\d{1,2}(?:['’]s)?(?:\s*(?:/|,|and|&)\s*)?)+)", re.I)

# Context words that say which document a § reference points into. The
# living version is the one being analysed (0.4 by default). Since #23 each
# version is a standalone superset that preserves the previous version's
# section numbers, so a § written against 0.2 or 0.3 still names the same
# section of 0.4: those are kept as spec refs, labelled with their version
# ("spec-0.3"). 0.1 numbering was not preserved (0.2 renumbered), so 0.1 refs
# go to other_refs.
FIRST_PRESERVED = (0, 2)   # the first version whose numbers later versions keep
SPEC_VERSION = "0.4"


def doc_hints(living: str) -> list[tuple[str, str]]:
    major, minor = (int(x) for x in living.split("."))
    esc = re.escape(living)
    hints = [
        (r"[\w./-]+\.md\b", "other"),   # any named file; the spec-specific patterns below win ties
        (rf"protocol-v{esc}|\bspec(?:'s)?\b|\b{esc} (?:text|§|document)|living (?:doc|spec)", "spec"),
    ]
    for m in range(minor - 1, -1, -1):
        v = f"{major}.{m}"
        ev = re.escape(v)
        hints.append((rf"protocol-v{ev}|\b{ev} §|{ev}'s", f"spec-{v}"))
    hints.append((r"plan|brief|proposal|notes?/|tn-\d|self-host|tk-core|roadmap|README|backlog|CLAUDE", "other"))
    return hints


def counts_as_spec(kind: str) -> bool:
    """Does a classified ref name a section of the living document?"""
    if kind in ("spec", "spec?"):
        return True
    m = re.fullmatch(r"spec-(\d+)\.(\d+)", kind)
    return bool(m) and (int(m.group(1)), int(m.group(2))) >= FIRST_PRESERVED


DOC_HINTS = doc_hints(SPEC_VERSION)


def classify_ref(text: str, pos: int, session: int | None) -> str:
    """Look back from a § at `pos` within its clause for the nearest doc hint."""
    # A version named right after the ref wins: "spec §11.4 at 0.1; §13.1 since 0.2".
    after = re.match(r"§[\d.]+[a-z]?\s+(?:at|in|of)\s+(\d+\.\d+)\b", text[pos:pos + 30])
    if after:
        return f"spec-{after.group(1)}"
    window_start = max(text.rfind(";", 0, pos), text.rfind(". ", 0, pos), text.rfind("(", 0, pos - 1), pos - 80)
    window = text[max(0, window_start):pos]
    best, best_at = None, -1
    for pat, kind in DOC_HINTS:
        for m in re.finditer(pat, window, re.I):
            if m.start() >= best_at:
                best, best_at = kind, m.start()
    if best:
        return best
    # Unmarked: a bare § in a decision written after the 0.2 draft (session 20)
    # almost always means the living spec.
    return "spec?" if (session or 0) >= 20 else "unknown"


def parse(claude_md: Path) -> list[dict]:
    lines = claude_md.read_text(encoding="utf-8").splitlines()
    try:
        start = next(i for i, l in enumerate(lines) if l.startswith("## Locked decisions"))
    except StopIteration:
        sys.exit("no '## Locked decisions' heading in CLAUDE.md")
    entries, cur = [], None
    for i in range(start + 1, len(lines)):
        l = lines[i]
        if l.startswith("## "):
            break
        m = ENTRY_RE.match(l)
        if m:
            cur = {"number": int(m.group(1)), "line": i + 1, "raw": m.group(2)}
            entries.append(cur)
        elif cur and l.strip():
            cur["raw"] += " " + l.strip()

    out = []
    for e in entries:
        raw = e["raw"]
        bold = re.match(r"\*\*(.+?)\*\*", raw)
        title = bold.group(1) if bold else re.split(r"[:.(]", raw, maxsplit=1)[0]
        title = title.strip().rstrip(":.")
        sess = re.search(r"\bsession (\d+)", raw)
        date = re.search(r"\b(20\d\d-\d\d-\d\d)\b", raw)
        head = raw[:200]
        by = [w for w in ("Fable", "Venkat", "Opus", "Sonnet") if w in head]
        session = int(sess.group(1)) if sess else None

        spec, other = [], []
        for m in SEC_RE.finditer(raw):
            kind = classify_ref(raw, m.start(), session)
            rec = {"section": m.group(1), "via": kind}
            (spec if counts_as_spec(kind) else other).append(rec)

        rels = []
        for m in REL_RE.finditer(raw):
            kind = next(RELATIONS[i] for i in range(len(RELATIONS)) if m.group(f"r{i}"))
            if re.search(r"\b(without|not|never|untouched|by|at)\b", m.group("mid"), re.I):
                continue  # "resolves X without touching #9" is not an edge to #9
            for n in DEC_RE.findall(m.group("nums")):
                n = int(n)
                if n == e["number"]:
                    continue
                src, dst = (e["number"], n) if kind[2] == "forward" else (n, e["number"])
                rels.append({"from": src, "to": dst, "type": kind[1], "phrase": m.group(0)[:90]})
        mentions = sorted({int(n) for n in DEC_RE.findall(raw)} - {e["number"]})
        tokens = sorted(set(re.findall(r"`([^`]{2,40})`", raw)))
        out.append({
            "number": e["number"], "title": title, "session": session,
            "session_inferred": False, "date": date.group(1) if date else None,
            "by": by, "line": e["line"], "text": raw,
            "spec_sections": dedupe(spec), "other_refs": dedupe(other),
            "relations": rels, "mentions": mentions, "tokens": tokens,
        })
    # Early decisions carry no session; borrow the next known one (an upper bound).
    for i, d in enumerate(out):
        if d["session"] is None:
            later = next((x["session"] for x in out[i:] if x["session"]), None)
            d["session"], d["session_inferred"] = later, True
    return out


def dedupe(refs: list[dict]) -> list[dict]:
    seen, out = set(), []
    for r in refs:
        if r["section"] not in seen:
            seen.add(r["section"])
            out.append(r)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--claude-md", type=Path, default=REPO / "CLAUDE.md")
    ap.add_argument("--out", type=Path, default=HERE / "decisions.json")
    ap.add_argument("--spec-version", default=None,
                    help="living spec version for classifying § refs (default: clauses.json's, else 0.4)")
    args = ap.parse_args(argv)
    global DOC_HINTS
    ver = args.spec_version
    if not ver:
        try:
            ver = json.loads((HERE / "clauses.json").read_text()).get("spec_version")
        except (OSError, json.JSONDecodeError):
            ver = None
    ver = ver or SPEC_VERSION
    DOC_HINTS = doc_hints(ver)
    ds = parse(args.claude_md)
    args.out.write_text(json.dumps({"source": "CLAUDE.md", "spec_version": ver, "decisions": ds}, indent=1, ensure_ascii=False) + "\n")
    nrel = sum(len(d["relations"]) for d in ds)
    print(f"decisions: {len(ds)} (#{ds[0]['number']}–#{ds[-1]['number']}), {nrel} amend/supersede-type edges")
    return 0


if __name__ == "__main__":
    sys.exit(main())
