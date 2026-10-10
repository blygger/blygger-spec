#!/usr/bin/env python3
"""Build the traceability graph and run the register's analyses.

Inputs   clauses.json, decisions.json (from extract.py / decisions.py),
         overrides.json, the spec itself, and — if present — every other
         toolkit area's  conformance/*/out/summary.json  (their checks'
         `spec_refs`, `decisions` and optional `clauses` become test nodes).
Outputs  out/graph.json     nodes + edges, the input to report.html
         out/analysis.json  the matrix, timeline and term tables the report draws
         out/summary.json   the toolkit's shared check format

Stdlib only:  python3 conformance/clauses/analyze.py
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = HERE / "out"
sys.path.insert(0, str(HERE))
import extract as X  # noqa: E402  (shared markdown helpers)

LEVELS = ("MUST", "SHOULD", "MAY")
SECTION_TOKEN_RE = re.compile(r"§?\s*(\d+(?:\.\d+)*[a-z]?)")
CLAUSE_ID_RE = re.compile(r"\b[CP]-\d+(?:\.\d+)?[a-z]?-\d{2,}\b")


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text())


def sec_key(s: str):
    return [int(p) if p.isdigit() else p for p in re.findall(r"\d+|[a-z]+", s)]


def parent_of(sec: str) -> str | None:
    if "." in sec:
        return sec.rsplit(".", 1)[0]
    m = re.match(r"^(\d+(?:\.\d+)*)[a-z]$", sec)  # 16.1a -> 16.1
    return m.group(1) if m else None


def descendants(sec: str, all_secs) -> list[str]:
    return [s for s in all_secs if s == sec or s.startswith(sec + ".") or re.match(re.escape(sec) + r"[a-z]$", s)]


# ----------------------------------------------------------------------------
# Tests from the other toolkit areas
# ----------------------------------------------------------------------------

def load_tests() -> list[dict]:
    tests = []
    for p in sorted((REPO / "conformance").glob("*/out/summary.json")):
        if p.parent.parent.name == "clauses":
            continue
        try:
            data = json.loads(p.read_text())
        except (OSError, json.JSONDecodeError) as e:
            print(f"warning: unreadable {p}: {e}", file=sys.stderr)
            continue
        area = data.get("area", p.parent.parent.name)
        for c in data.get("checks", []):
            refs = c.get("spec_refs", []) or []
            secs, cls = [], set(c.get("clauses", []) or [])
            for r in refs:
                cls.update(CLAUSE_ID_RE.findall(str(r)))
                m = SECTION_TOKEN_RE.search(str(r))
                if m and not CLAUSE_ID_RE.search(str(r)):
                    secs.append(m.group(1))
            decs = []
            for d in c.get("decisions", []) or []:
                m = re.search(r"\d+", str(d))
                if m:
                    decs.append(int(m.group()))
            tests.append({"id": f"{area}:{c.get('id')}", "area": area, "title": c.get("title", ""),
                          "status": c.get("status", "info"), "sections": secs,
                          "clauses": sorted(cls), "decisions": decs})
    return tests


# ----------------------------------------------------------------------------
# Main analysis
# ----------------------------------------------------------------------------

def main() -> int:
    OUT.mkdir(exist_ok=True)
    reg = load("clauses.json")
    dec_doc = load("decisions.json")
    ov = json.loads((HERE / "overrides.json").read_text())
    spec_path = REPO / reg["source"]
    spec_lines = spec_path.read_text(encoding="utf-8").splitlines()

    sections = {s["id"]: s for s in reg["sections"] if s["id"] != "0"}
    sec_ids = sorted(sections, key=sec_key)
    clauses = [c for c in reg["clauses"] if not c.get("excluded")]
    by_id = {c["id"]: c for c in clauses}
    decisions = {d["number"]: d for d in dec_doc["decisions"]}
    max_dec = max(decisions)
    tests = load_tests()
    checks: list[dict] = []

    def check(cid, title, status, detail, spec_refs=(), decs=()):
        checks.append({"id": cid, "title": title, "status": status, "detail": detail,
                       "spec_refs": [f"§{s}" for s in spec_refs], "decisions": [f"#{d}" for d in decs]})

    # --- test coverage join ---------------------------------------------------
    for c in clauses:
        c["tests"], c["section_tests"] = [], []
    for t in tests:
        for cid in t["clauses"]:
            if cid in by_id:
                by_id[cid]["tests"].append(t["id"])
        for s in t["sections"]:
            for c in clauses:
                if c["section"] == s:
                    c["section_tests"].append(t["id"])
    for c in clauses:
        c["coverage"] = "exact" if c["tests"] else ("section" if c["section_tests"] else "none")

    # --- token specificity (for decision<->clause "shares-token" links) ------
    tok_count = Counter(t for c in clauses for t in set(c["tokens"]))
    specific = {t for t, n in tok_count.items() if n <= 10 and len(t) > 2 and not t.startswith("http")}

    # --- decision grounding -------------------------------------------------
    for k, secs in ov.get("decision_sections", {}).items():
        if k.isdigit() and int(k) in decisions:
            have = {r["section"] for r in decisions[int(k)]["spec_sections"]}
            decisions[int(k)]["spec_sections"] += [{"section": s, "via": "curated"} for s in secs if s not in have]
    for n, d in decisions.items():
        direct = [c["id"] for c in clauses if n in c["decisions"]]
        nearby = [c["id"] for c in clauses if n in c.get("decisions_nearby", [])]
        named, missing = [], []
        for r in d["spec_sections"]:
            (named if r["section"] in sections else missing).append(r)
        via_sec = sorted({c["id"] for r in named for s in descendants(r["section"], sec_ids)
                          for c in clauses if c["section"] == s}, key=lambda i: sec_key(i))
        via_tok = sorted({c["id"] for c in clauses for t in c["tokens"] if t in specific and t in d["tokens"]})
        norm_hits = [i for i in set(direct + nearby + via_sec) if by_id[i]["status"] == "normative"]
        pend_hits = [i for i in set(direct + nearby + via_sec) if by_id[i]["status"] == "pending"]
        names_16 = [r for r in named if r["section"].startswith("16")]
        if norm_hits:
            g = "normative"
        elif pend_hits or names_16:
            g = "pending"
        elif via_tok:
            g = "token-only"
        else:
            g = "none"
        d.update({"direct_clauses": direct, "nearby_clauses": nearby, "section_clauses": via_sec,
                  "token_clauses": via_tok, "grounding": g, "missing_sections": missing,
                  "cited_in_spec": bool(direct or nearby),
                  "class": ov.get("decision_classes", {}).get(str(n))})

    # --- relations (parsed + curated), deduped --------------------------------
    rels, seen = [], set()
    for d in decisions.values():
        for r in d["relations"]:
            k = (r["from"], r["to"], r["type"])
            if k not in seen:
                seen.add(k)
                rels.append({**r, "source": "parsed"})
    for r in ov.get("decision_relations", []):
        k = (r["from"], r["to"], r["type"])
        if k not in seen:
            seen.add(k)
            rels.append({**r, "source": "curated"})

    # =========================================================================
    # Checks
    # =========================================================================
    live = [c for c in clauses if c["status"] == "normative"]
    pend = [c for c in clauses if c["status"] == "pending"]
    lv = Counter(c["level"] for c in live)
    check("register.counts", "Clause register extracted", "info",
          f"{len(live)} normative clauses (MUST {lv['MUST']}, SHOULD {lv['SHOULD']}, MAY {lv['MAY']}) "
          f"in {len({c['section'] for c in live})} sections; {len(pend)} pending §16 sentences; "
          f"{len(decisions)} decisions; {len(tests)} tests joined from other areas. "
          f"Side split: " + ", ".join(f"{k} {v}" for k, v in Counter(c['side'] for c in live).most_common()))

    # MUST coverage per section
    must_by_sec = defaultdict(list)
    for c in live:
        if c["level"] == "MUST":
            must_by_sec[c["section"]].append(c)
    n_exact = sum(1 for cs in must_by_sec.values() for c in cs if c["coverage"] == "exact")
    n_sec = sum(1 for cs in must_by_sec.values() for c in cs if c["coverage"] == "section")
    total_must = sum(len(v) for v in must_by_sec.values())
    check("coverage.must", "MUST clauses with a test", "pass" if n_exact == total_must else "warn",
          f"{n_exact}/{total_must} MUST clauses have a clause-level test; {n_sec} more are covered only at "
          f"section level; {total_must - n_exact - n_sec} have no test at all. (Decision #48: every MUST is a "
          f"failable clause, so every MUST wants a test.)", decs=[48])
    for s in sorted(must_by_sec, key=sec_key):
        cs = must_by_sec[s]
        untested = [c["id"] for c in cs if c["coverage"] != "exact"]
        only_sec = [c["id"] for c in cs if c["coverage"] == "section"]
        st = "pass" if not untested else "warn"
        det = (f"All {len(cs)} MUST clauses tested." if not untested else
               f"{len(untested)}/{len(cs)} MUST clauses untested at clause level: {', '.join(untested)}"
               + (f" (section-level coverage only: {', '.join(only_sec)})" if only_sec else ""))
        check(f"coverage.must.{s}", f"§{s} {sections[s]['heading'][:60]} — MUST coverage", st, det, [s])

    # dangling references in clauses
    dangling = [(c, r) for c in clauses for r in c["refs"] if r not in sections]
    for c, r in dangling:
        check(f"refs.dangling.{c['id']}", f"{c['id']} cites §{r}, which has no heading", "warn",
              f"Clause text: “{c['text'][:220]}”. §{r} does not exist in {reg['source']} "
              f"(sections under §{r.split('.')[0]}: {', '.join(x for x in sec_ids if x.split('.')[0] == r.split('.')[0])}).",
              [c["section"], r])
    # and anywhere in the normative text, not only in keyword sentences
    doc_dangling = defaultdict(list)
    in_fence = False
    for i, line in enumerate(spec_lines, 1):
        if X.FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence or line.startswith("#"):
            continue
        refs, _ = X.section_refs(line)
        for r in refs:
            if r not in sections:
                doc_dangling[r].append(i)
    check("refs.dangling.document", "§ references to headings that do not exist (whole document)",
          "warn" if doc_dangling else "pass",
          "; ".join(f"§{r} on line{'s' if len(v) > 1 else ''} {', '.join(map(str, v))}" for r, v in sorted(doc_dangling.items()))
          or "Every § reference resolves to a heading.", sorted(doc_dangling))

    # decisions cited in the spec that don't exist
    spec_cited = sorted({n for c in reg["clauses"] for n in c["decisions"] + c.get("decisions_nearby", [])})
    bad = [n for n in spec_cited if n not in decisions]
    check("decisions.cited", "Decision numbers cited in normative text exist", "fail" if bad else "pass",
          (f"Unknown decisions cited: {bad}" if bad else
           f"The spec cites {len(spec_cited)} decisions by number in keyword sentences: "
           + ", ".join(f"#{n}" for n in spec_cited) + f". The other {len(decisions) - len(spec_cited)} are linked only through the "
           "sections their records name."), decs=spec_cited)

    # decision grounding
    gcount = Counter(d["grounding"] for d in decisions.values())
    check("decisions.grounding", "How each locked decision reaches the living spec", "info",
          f"normative {gcount['normative']}, pending (§16 only) {gcount['pending']}, token-only {gcount['token-only']}, "
          f"none {gcount['none']}. A decision is 'normative' when a normative clause cites it or sits in a section its "
          f"record names; 'token-only' when the only link is a shared wire token such as `stub_of`.")
    for n, d in sorted(decisions.items()):
        if d["grounding"] == "normative":
            continue
        cls = d["class"]
        if cls:
            st, why = "info", f"classified '{cls}' in overrides.json — no normative clause expected"
            if d["grounding"] == "pending":
                why += "; its §16 entry records the ruling"
        elif d["grounding"] == "pending":
            st, why = "info", "ruled shape in §16, not yet normative (expected under #21/#42)"
        else:
            st, why = "warn", "no clause, no §16 entry, no classification: is it in the spec at all?"
        tok = f" Shares tokens with {', '.join(d['token_clauses'][:6])}." if d["token_clauses"] else ""
        check(f"decisions.unground.{n}", f"#{n} {d['title'][:70]} — {d['grounding']}", st,
              why + "." + tok + (f" Record names spec §{', §'.join(r['section'] for r in d['spec_sections'])}." if d["spec_sections"] else ""),
              [r["section"] for r in d["spec_sections"] if r["section"] in sections], [n])

    # decisions naming spec sections that don't exist in 0.3
    for n, d in sorted(decisions.items()):
        sure = [r for r in d["missing_sections"] if r["via"] in ("spec", "spec-0.2")]
        if sure:
            check(f"decisions.stale-ref.{n}", f"#{n} names spec §{', §'.join(r['section'] for r in sure)}, absent from 0.3",
                  "warn", f"Decision #{n} (session {d['session']}) points at "
                  + ", ".join(f"§{r['section']} ({r['via']})" for r in sure)
                  + ". The section number may come from an earlier spec version; the record is now a dangling pointer.",
                  decs=[n])

    # relations: chains and one-sided records
    chains = defaultdict(list)
    for r in rels:
        chains[r["to"]].append(r)
    lines_ = []
    for to, rs in sorted(chains.items()):
        lines_.append(f"#{to} ← " + ", ".join(f"#{r['from']} {r['type']}" for r in rs))
    check("decisions.chains", "Amend / supersede / refine chains between decisions", "info",
          f"{len(rels)} edges ({sum(r['source'] == 'parsed' for r in rels)} parsed from the records, "
          f"{sum(r['source'] == 'curated' for r in rels)} curated). " + "; ".join(lines_), decs=sorted(chains))
    for r in rels:
        if r["type"] not in ("amends", "supersedes", "corrects"):
            continue
        target = decisions.get(r["to"])
        if target and r["from"] not in target["mentions"]:
            check(f"decisions.one-sided.{r['from']}-{r['to']}",
                  f"#{r['to']} does not record that #{r['from']} {r['type']} it", "warn",
                  f"#{r['from']} says it {r['type']} #{r['to']}, but #{r['to']}'s record never mentions #{r['from']}; "
                  f"a reader of #{r['to']} alone gets the pre-{r['type'][:-1] if r['type'].endswith('s') else r['type']} rule.",
                  decs=[r["from"], r["to"]])

    # terminology
    gloss = {t["term"].lower() for t in reg["terminology"]}
    gloss_stems = {g.rstrip("s") for g in gloss}
    raw_spec = "\n".join(spec_lines)
    json_keys = set(re.findall(r'"([a-z_]+)"\s*:', raw_spec))
    headings_text = " ".join(s["heading"] for s in reg["sections"])
    bold_terms = defaultdict(set)
    for c in live:
        for b in re.findall(r"\*\*([^*]{3,40})\*\*", c["text"]):
            t = b.strip().rstrip(".:,;").strip("`")
            if X.KW_RE.search(t) or len(t.split()) > 4 or re.match(r"(?i)(no|not|never|only|every|any|all|this|that|these|it|a|the)\b", t):
                continue
            if not re.match(r"^[A-Za-z][a-z-]+(?: [a-z-]+){0,3}$", t):
                continue
            bold_terms[t.lower()].add(c["section"])
    def stem(w):
        return re.sub(r"(ed|ing|s)$", "", w)
    gloss_stems = {stem(g) for g in gloss}
    # keep multi-word terms, or single words bolded in 2+ sections (single-word
    # bold is usually emphasis: **evidence**, **gone**)
    undefined_terms = {t: s for t, s in bold_terms.items()
                       if stem(t) not in gloss_stems and stem(t)[:-1] not in gloss_stems and (" " in t or len(s) >= 2)}
    used = Counter()
    for c in live:
        low = c["text"].lower()
        for g in gloss:
            if re.search(r"\b" + re.escape(g.rstrip("s")), low):
                used[g] += 1
    unused_gloss = sorted(g for g in gloss if used[g] == 0)
    field_tokens = Counter(t.rstrip("[]") for c in live for t in c["tokens"] if re.fullmatch(r"[a-z_]+(\[\])?", t))
    prose_only = sorted(t for t in field_tokens if t not in json_keys and t not in headings_text and "_" in t)
    check("terms.bold-not-in-glossary", "Bold terms in normative clauses that §2 Terminology does not define",
          "warn" if undefined_terms else "pass",
          f"{len(undefined_terms)} terms: " + "; ".join(f"“{t}” (§{', §'.join(sorted(s, key=sec_key))})"
                                                      for t, s in sorted(undefined_terms.items(), key=lambda kv: (-len(kv[1]), kv[0]))),
          ["2"])
    check("terms.glossary-unused", "§2 terms never used in a normative clause", "info",
          ", ".join(unused_gloss) or "Every glossary term is used.", ["2"])
    check("terms.fields-prose-only", "Field-like tokens in clauses that appear in no JSON example or heading",
          "info" if prose_only else "pass",
          (", ".join(f"`{t}`" for t in prose_only) + " — named in rules but never shown in a JSON example: "
           "an implementer must infer the shape from prose.") if prose_only else "Every field named in a clause appears in an example.")
    gloss_dangling = [(t["term"], r) for t in reg["terminology"] for r in t["refs"] if r not in sections]
    if gloss_dangling:
        check("terms.glossary-refs", "Glossary entries citing missing sections", "warn",
              "; ".join(f"{t} → §{r}" for t, r in gloss_dangling), ["2"])

    # lowercase modal verbs in normative sections — possible un-keyworded obligations
    sents = []
    secs_all, blocks = X.read_sections(spec_lines)
    modes = {s["id"]: X.section_mode(s["id"], s["heading"]) for s in secs_all}
    for b in blocks:
        if modes.get(b["section"]) != "normative":
            continue
        masked = X.mask_code(b["text"])
        for a, z in X.split_sentences(b["text"]):
            sm = masked[a:z]
            if X.KW_RE.search(sm):
                continue
            m = re.search(r"\b(must|shall|should|required|may not|never)\b", sm)
            if m and m.group(1) != "never":
                sents.append({"section": b["section"], "line": b["line"], "word": m.group(1), "text": b["text"][a:z].strip()})
    absolutes = []
    for b in blocks:
        if modes.get(b["section"]) != "normative":
            continue
        masked = X.mask_code(b["text"])
        for a, z in X.split_sentences(b["text"]):
            sm = masked[a:z]
            if not X.KW_RE.search(sm) and re.search(r"\b(never|always|forbidden|is an error|publish error)\b", sm):
                absolutes.append({"section": b["section"], "line": b["line"], "text": b["text"][a:z].strip()})
    by_sec = Counter(s["section"] for s in sents)
    check("lint.lowercase-modals", "Sentences in normative sections using lowercase must/should/required",
          "warn" if sents else "pass",
          f"{len(sents)} sentences read like obligations but carry no RFC 2119 keyword, so a conformance suite "
          f"cannot see them. Most in: " + ", ".join(f"§{s} ({n})" for s, n in by_sec.most_common(8))
          + ". Full list in out/analysis.json → lowercase_modals.", sorted(by_sec, key=sec_key))

    ab_sec = Counter(a["section"] for a in absolutes)
    check("lint.absolutes", "Absolute statements (never / always / publish error) with no RFC 2119 keyword", "info",
          f"{len(absolutes)} sentences in normative sections state a rule in prose ('never', 'always', "
          f"'is a publish error') without a keyword. Many are deliberate restatements; some are the only "
          f"statement of a rule. Most in: " + ", ".join(f"§{s} ({n})" for s, n in ab_sec.most_common(8))
          + ". Full list in out/analysis.json → absolutes.", sorted(ab_sec, key=sec_key))

    # density
    dens = []
    for s in sec_ids:
        sec = sections[s]
        if modes.get(s) != "normative":
            continue
        n = sum(sec["counts"].values())
        dens.append({"section": s, "heading": sec["heading"], "lines": sec["n_lines"], "clauses": n,
                     "per100": round(100 * n / max(sec["n_lines"], 1), 1), **sec["counts"]})
    quiet = [d for d in dens if d["clauses"] == 0 and d["lines"] >= 12]
    check("density.sections", "Keyword density per section", "info",
          "Densest: " + ", ".join(f"§{d['section']} {d['per100']}/100 lines" for d in sorted(dens, key=lambda d: -d["per100"])[:5])
          + ". Normative sections of 12+ lines with no keyword at all: "
          + (", ".join(f"§{d['section']} {d['heading'][:40]} ({d['lines']} lines)" for d in quiet) or "none") + ".")

    # sides
    unknown = [c["id"] for c in live if c["side"] == "unknown"]
    check("side.unknown", "Normative clauses with no identifiable conforming party", "info" if unknown else "pass",
          (", ".join(unknown) + " — add a 'side' override in overrides.json.") if unknown else "Every clause has a side.")

    # §16 pending shapes
    ps = reg["pending_shapes"]
    pc = Counter(p["status"] for p in ps)
    check("pending.shapes", "§16 ruled / deferred / reserved constructs", "info",
          ", ".join(f"{k} {v}" for k, v in pc.items()) + ". Ruled-but-unbuilt: "
          + ", ".join(f"§{p['section']} {p['heading'][:50]}" for p in ps if p["status"].startswith("ruled")))
    for p in ps:
        for t in p["promoted_to"]:
            if t not in sections:
                check(f"pending.promoted.{p['section']}", f"§{p['section']} says promoted to §{t}, which does not exist",
                      "warn", p["heading"], [p["section"], t])

    # =========================================================================
    # Graph
    # =========================================================================
    nodes, edges = [], []

    def node(i, typ, label, **kw):
        nodes.append({"id": i, "type": typ, "label": label, **kw})

    def edge(a, b, typ, **kw):
        edges.append({"source": a, "target": b, "type": typ, **kw})

    for inv in reg["invariants"]:
        node(f"inv:{inv['id']}", "invariant", f"{inv['id']} {inv['title'][:40]}", text=inv["text"])
        for n in ov.get("invariant_decisions", {}).get(inv["id"], []):
            edge(f"inv:{inv['id']}", f"dec:{n}", "states")
        for r in inv["refs"]:
            if r in sections:
                edge(f"inv:{inv['id']}", f"sec:{r}", "refs")
    for n, d in decisions.items():
        node(f"dec:{n}", "decision", f"#{n}", title=d["title"], session=d["session"], text=d["text"],
             grounding=d["grounding"], cls=d["class"])
        for r in d["spec_sections"]:
            if r["section"] in sections:
                edge(f"dec:{n}", f"sec:{r['section']}", "names", via=r["via"])
        for cid in d["direct_clauses"]:
            edge(f"dec:{n}", f"cl:{cid}", "cites")
        for cid in d["nearby_clauses"]:
            edge(f"dec:{n}", f"cl:{cid}", "cites-nearby")
        for cid in d["token_clauses"]:
            edge(f"dec:{n}", f"cl:{cid}", "shares-token")
    for r in rels:
        edge(f"dec:{r['from']}", f"dec:{r['to']}", r["type"], source_kind=r["source"])
    for s in sec_ids:
        sec = sections[s]
        node(f"sec:{s}", "section", f"§{s}", title=sec["heading"], mode=sec.get("mode"), counts=sec["counts"])
        p = parent_of(s)
        if p and p in sections:
            edge(f"sec:{s}", f"sec:{p}", "child-of")
    for c in clauses:
        node(f"cl:{c['id']}", "clause", c["id"], level=c["level"], status=c["status"], side=c["side"],
             text=c["text"], coverage=c["coverage"], section=c["section"])
        edge(f"cl:{c['id']}", f"sec:{c['section']}", "in")
        for r in c["refs"]:
            if r in sections and r != c["section"]:
                edge(f"cl:{c['id']}", f"sec:{r}", "refs")
    for t in tests:
        node(f"test:{t['id']}", "test", t["id"], title=t["title"], status=t["status"], area=t["area"])
        for s in t["sections"]:
            if s in sections:
                edge(f"test:{t['id']}", f"sec:{s}", "tests-section")
        for cid in t["clauses"]:
            if cid in by_id:
                edge(f"test:{t['id']}", f"cl:{cid}", "tests")
        for n in t["decisions"]:
            if n in decisions:
                edge(f"test:{t['id']}", f"dec:{n}", "tests-decision")

    # =========================================================================
    # Analysis tables for the report
    # =========================================================================
    matrix = []
    for s in sec_ids:
        row = {"section": s, "heading": sections[s]["heading"], "mode": modes.get(s)}
        for L in LEVELS:
            cs = [c for c in clauses if c["section"] == s and c["level"] == L]
            row[L] = {"n": len(cs), "exact": sum(c["coverage"] == "exact" for c in cs),
                      "section": sum(c["coverage"] == "section" for c in cs), "ids": [c["id"] for c in cs]}
        if any(row[L]["n"] for L in LEVELS):
            matrix.append(row)
    timeline = [{"number": n, "title": d["title"], "session": d["session"], "inferred": d["session_inferred"],
                 "grounding": d["grounding"], "cls": d["class"]} for n, d in sorted(decisions.items())]

    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    (OUT / "graph.json").write_text(json.dumps({"generated_at": now, "nodes": nodes, "edges": edges}, ensure_ascii=False))
    (OUT / "analysis.json").write_text(json.dumps({
        "generated_at": now, "spec": reg["source"], "matrix": matrix, "timeline": timeline, "relations": rels,
        "density": dens, "lowercase_modals": sents, "absolutes": absolutes, "undefined_terms": {k: sorted(v) for k, v in undefined_terms.items()},
        "unused_glossary": unused_gloss, "prose_only_fields": prose_only, "tests": tests,
        "decisions": {n: {k: d[k] for k in ("title", "session", "grounding", "class", "direct_clauses", "nearby_clauses",
                                            "section_clauses", "token_clauses", "spec_sections", "missing_sections")}
                      for n, d in decisions.items()},
    }, indent=1, ensure_ascii=False))
    summary = {"area": "clauses", "title": "Clause register & traceability", "generated_at": now, "checks": checks}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    st = Counter(c["status"] for c in checks)
    print(f"checks: {len(checks)} ({', '.join(f'{k} {v}' for k, v in st.items())}); "
          f"graph: {len(nodes)} nodes, {len(edges)} edges; tests joined: {len(tests)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
