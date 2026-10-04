#!/usr/bin/env python3
"""Run every Alloy command in models/*.als and build out/summary.json + out/report.html.

    python3 conformance/alloy/run.py            # run everything (~10-20 min)
    python3 conformance/alloy/run.py --reuse    # rebuild the report from out/raw/ without re-solving
    python3 conformance/alloy/run.py --only ForkFaithful,Vac_ForkWithQuotes

Needs Java 17+ (default /opt/homebrew/opt/openjdk@17/bin/java, override with $JAVA)
and Graphviz `dot` (default /opt/homebrew/bin/dot, override with $DOT). Downloads the
Alloy 6 jar into vendor/ on first run. Python 3 stdlib only.
"""
import argparse, datetime, html, json, os, re, shutil, subprocess, sys, time, urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from checks import CHECKS, MODELS  # noqa: E402

ALLOY_VERSION = "6.2.0"
JAR = os.path.join(HERE, "vendor", "org.alloytools.alloy.dist.jar")
JAR_URL = f"https://github.com/AlloyTools/org.alloytools.alloy/releases/download/v{ALLOY_VERSION}/org.alloytools.alloy.dist.jar"
JAVA = os.environ.get("JAVA") or ("/opt/homebrew/opt/openjdk@17/bin/java" if os.path.exists("/opt/homebrew/opt/openjdk@17/bin/java") else "java")
DOT = os.environ.get("DOT") or ("/opt/homebrew/bin/dot" if os.path.exists("/opt/homebrew/bin/dot") else "dot")
SOLVER = os.environ.get("ALLOY_SOLVER", "glucose")
OUT = os.path.join(HERE, "out")
RAW = os.path.join(OUT, "raw")


# ----------------------------------------------------------------- running
def ensure_jar():
    if os.path.exists(JAR):
        return
    os.makedirs(os.path.dirname(JAR), exist_ok=True)
    print(f"downloading Alloy {ALLOY_VERSION} …", file=sys.stderr)
    urllib.request.urlretrieve(JAR_URL, JAR)


def commands_in(model):
    src = open(os.path.join(HERE, "models", model + ".als")).read()
    out = []
    for m in re.finditer(r"^(check|run)\s+(\w+)(.*?)(?=^\s*(?:check|run)\s|\Z)", src, re.M | re.S):
        kind, name, rest = m.group(1), m.group(2), m.group(3)
        scope = re.search(r"\bfor\b(.*)", rest.replace("\n", " "))
        out.append(dict(kind=kind, name=name, scope=("for" + scope.group(1)).strip() if scope else ""))
    return out


def run_command(model, name):
    d = os.path.join(RAW, model, name)
    if os.path.exists(d):
        shutil.rmtree(d)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    t0 = time.time()
    p = subprocess.run([JAVA, "-jar", JAR, "exec", "-q", "-f", "-s", SOLVER, "-t", "xml", "-c", name, "-o", d,
                        os.path.join(HERE, "models", model + ".als")], capture_output=True, text=True)
    dt = time.time() - t0
    os.makedirs(d, exist_ok=True)
    sol = os.path.join(d, f"{name}-solution-0.xml")
    res = dict(seconds=round(dt, 1), sat=os.path.exists(sol), error=None)
    # a receipt is written whenever the command was solved (SAT or UNSAT)
    if not os.path.exists(os.path.join(d, "receipt.json")):
        res["error"] = (p.stdout + p.stderr)[-2000:]
    json.dump(res, open(os.path.join(d, "result.json"), "w"))
    return res


def load_result(model, name):
    f = os.path.join(RAW, model, name, "result.json")
    return json.load(open(f)) if os.path.exists(f) else None


# ----------------------------------------------------------------- parsing
def short(a):
    return a.split("$")[0] + a.split("$")[1] if "$" in a else a


def parse_trace(path):
    """Return list of states; each state = {name: set-of-tuples} for sigs, fields, skolems."""
    root = ET.parse(path).getroot()
    states = []
    for inst in root.findall("instance"):
        st = {}
        for el in inst:
            if el.tag not in ("sig", "field", "skolem"):
                continue
            lab = el.get("label").replace("this/", "")
            if el.tag == "sig":
                st[lab] = {(a.get("label"),) for a in el.findall("atom")}
            else:
                # fields with the same name on different sigs (e.g. `host`) are unioned
                st[lab] = st.get(lab, set()) | {tuple(a.get("label") for a in t.findall("atom")) for t in el.findall("tuple")}
        states.append(st)
    meta = root.find("instance").attrib if root.find("instance") is not None else {}
    return states, meta


def rel(st, name):
    return st.get(name, set())


def fn(st, name):
    """binary relation as dict a -> b (functional fields)"""
    return {t[0]: t[1] for t in rel(st, name) if len(t) == 2}


def multi(st, name):
    out = {}
    for t in rel(st, name):
        out.setdefault(t[0], []).append(t[1:] if len(t) > 2 else t[1])
    return out


# ----------------------------------------------------------------- blygger traces
def blygger_story(states):
    s0 = states[0]
    item = fn(s0, "item"); num = fn(s0, "num"); kind = fn(s0, "kind"); home = fn(s0, "home")
    grammar = fn(s0, "grammar"); of = fn(s0, "of"); partial = fn(s0, "partial")
    bakes = multi(s0, "bakes"); stub = fn(s0, "stubOf"); fork = fn(s0, "forkedFrom")
    flat = multi(s0, "flat"); attrib = multi(s0, "attrib")
    prose = multi(s0, "prose"); dirs = multi(s0, "directives"); target = fn(s0, "target"); sel = fn(s0, "sel")
    items = sorted({a for (a,) in rel(s0, "Item")})
    iname = {it: "ABCDEFGH"[k] for k, it in enumerate(items)}
    origins = sorted({a for (a,) in rel(s0, "Origin")})
    oname = {o: f"O{k + 1}" for k, o in enumerate(origins)}

    def vlabel(v):
        return f"{iname[item[v]]} v{num[v]}"

    def kshort(v):
        return kind[v].split("$")[0].lower()

    events = []
    for t in range(1, len(states)):
        a, b = states[t - 1], states[t]
        newp = {x for (x,) in rel(b, "published")} - {x for (x,) in rel(a, "published")}
        newpin = {x for (x,) in rel(b, "pinned")} - {x for (x,) in rel(a, "pinned")}
        ev = []
        for v in newp:
            o = oname[home[item[v]]]
            if kind[v].startswith("Withdrawn"):
                ev.append(f"{o} withdraws {iname[item[v]]} (endcap v{num[v]})")
            elif v in fork and num[v] == "1":
                ev.append(f"{o} forks {vlabel(fork[v])} as {vlabel(v)}")
            elif num[v] == "1":
                ev.append(f"{o} publishes {vlabel(v)} ({kshort(v)})")
            else:
                ev.append(f"{o} republishes {vlabel(v)}")
        for v in newpin:
            ev.append(f"{oname[home[item[v]]]} pins {vlabel(v)}")
        if rel(a, "held") != rel(b, "held") or rel(a, "gone") != rel(b, "gone"):
            for o in origins:
                ha = {v for (r, v) in rel(a, "held") if r == o}; hb = {v for (r, v) in rel(b, "held") if r == o}
                ga = {i for (r, i) in rel(a, "gone") if r == o}; gb = {i for (r, i) in rel(b, "gone") if r == o}
                for i in sorted({item[v] for v in ha ^ hb} | (ga ^ gb)):
                    gone_now = i in gb
                    ev.append(f"{oname[o]} polls {iname[i]}" + (" — sees endcap" if gone_now else ""))
        if not ev:
            # a poll that changed nothing is indistinguishable from a stutter
            ev.append("— (no change)")
        events.append("; ".join(ev))

    def describe(v):
        d = dict(label=vlabel(v), kind=kshort(v), origin=oname[home[item[v]]], bakes=[], stub=None, fork=None)
        for b in bakes.get(v, []):
            d["bakes"].append((vlabel(of[b]), short(partial[b]) if b in partial else None))
        if v in stub: d["stub"] = vlabel(stub[v])
        if v in fork: d["fork"] = vlabel(fork[v])
        d["prose"] = [short(p) for p in prose.get(v, [])]
        d["dirs"] = [(iname[target[x]], short(sel[x]) if x in sel else None) for x in dirs.get(v, [])]
        return d

    def dot_for_state(t):
        st = states[t]
        pub = sorted({x for (x,) in rel(st, "published")}, key=lambda v: (iname[item[v]], int(num[v])))
        pins = {x for (x,) in rel(st, "pinned")}
        sk = set()
        for k, vals in st.items():
            if k.startswith("$"):
                sk |= {x for tup in vals for x in tup}
        lines = ["digraph G {", 'graph [rankdir=LR, bgcolor="transparent", fontname="Helvetica", fontsize=10, nodesep=0.25, ranksep=0.35, pad=0.1];',
                 'node [fontname="Helvetica", fontsize=10, shape=box, style="rounded,filled", fillcolor="#ffffff", color="#5b5a55", penwidth=1];',
                 'edge [fontname="Helvetica", fontsize=9, color="#5b5a55", fontcolor="#5b5a55"];']
        for o in origins:
            lines.append(f'subgraph "cluster_{o}" {{ label="{oname[o]} · {"partial-aware" if grammar[o].startswith("Partial") else "whole-only client"}"; style="rounded,dashed"; color="#b9b4a7"; fontcolor="#5b5a55";')
            lines.append(f'"{o}" [label="{oname[o]} store", shape=note, fillcolor="#f1efe9"];')
            for v in pub:
                if home[item[v]] != o:
                    continue
                k = kshort(v)
                extra = []
                if v in pins: extra.append("📌 pinned")
                d = describe(v)
                if d["prose"]: extra.append("text: " + ",".join(d["prose"]))
                if flat.get(v): extra.append("> flattened quote: " + ",".join(short(p) for p in flat[v]))
                if d["dirs"]:
                    extra.append("md: " + " ".join(f"![[{i}]]" + (f">{s}" if s else "") for i, s in d["dirs"]))
                fill = "#fbe3e3" if k == "withdrawn" else ("#e3ecf9" if v in pins else "#ffffff")
                pen = 2.5 if v in sk else 1
                col = "#a23b3b" if v in sk else "#5b5a55"
                lab = f"{vlabel(v)}\\n{k}" + ("\\n" + "\\n".join(extra) if extra else "")
                periph = 2 if v in pins else 1
                lines.append(f'"{v}" [label="{lab}", fillcolor="{fill}", penwidth={pen}, color="{col}", peripheries={periph}];')
            lines.append("}")
        for v in pub:
            for b in bakes.get(v, []):
                w = of[b]
                if b in partial:
                    lines.append(f'"{v}" -> "{w}" [label="partial: {short(partial[b])}", style=dashed, color="#2b5bab", fontcolor="#2b5bab"];')
                else:
                    lines.append(f'"{v}" -> "{w}" [label="quotes", color="#2b5bab", fontcolor="#2b5bab"];')
            if v in stub:
                lines.append(f'"{v}" -> "{stub[v]}" [label="stub_of", color="#a46a00", fontcolor="#a46a00"];')
            for w in attrib.get(v, []):
                lines.append(f'"{v}" -> "{w}" [label="attribution line", style=dotted, color="#2f7a45", fontcolor="#2f7a45"];')
            if v in fork:
                lines.append(f'"{v}" -> "{fork[v]}" [label="forked_from", color="#2f7a45", fontcolor="#2f7a45"];')
        for (r, v) in sorted(rel(st, "held")):
            lines.append(f'"{r}" -> "{v}" [label="holds", style=dotted];')
        lines.append("}")
        return "\n".join(lines)

    return events, dot_for_state


# ----------------------------------------------------------------- watermark traces
def watermark_story(states):
    s0 = states[0]
    ver = fn(s0, "ver"); kind = fn(s0, "kind")
    policy = list(fn(s0, "policy").values())[0].split("$")[0]

    def dl(d):
        return f"v{ver[d]}" + (" endcap" if kind[d].startswith("Endcap") else "")

    rows = []
    for t, st in enumerate(states):
        cur = list(fn(st, "current").values()); served = sorted(fn(st, "everServed").values()) if False else sorted(v for (_, v) in rel(st, "everServed"))
        rw = {x for (x,) in rel(st, "Rewrites")}
        rows.append(dict(current=dl(cur[0]) if cur else "—",
                         served=", ".join(dl(x) + ("*" if x in rw else "") for x in served) or "—",
                         wm=list(fn(st, "watermark").values())[0], hi=list(fn(st, "hi").values())[0],
                         stored=(dl(list(fn(st, "stored").values())[0]) if fn(st, "stored") else "null"),
                         alarm=(dl(list(fn(st, "alarm").values())[0]) if fn(st, "alarm") else "—")))
    events = []
    for t in range(1, len(states)):
        a, b = rows[t - 1], rows[t]
        sa = {v for (_, v) in rel(states[t - 1], "everServed")}; sb = {v for (_, v) in rel(states[t], "everServed")}
        new = sb - sa
        rw = {x for (x,) in rel(states[t], "Rewrites")} - {x for (x,) in rel(states[t - 1], "Rewrites")}
        if rw:
            events.append(f"origin rewrites history → serves {dl(list(rw)[0])}")
        elif new:
            events.append(f"origin publishes {dl(list(new)[0])}")
        elif a["alarm"] != "—" and b["alarm"] == "—":
            events.append("user confirms reset")
        elif (a["wm"], a["stored"], a["alarm"], a["hi"]) != (b["wm"], b["stored"], b["alarm"], b["hi"]):
            if b["alarm"] != a["alarm"]:
                events.append(f"reader fetches {b['alarm']} → discrepancy surfaced")
            else:
                events.append(f"reader fetches → stores {b['stored']}")
        else:
            events.append("— (no change / fetch of same body)")

    def dot_for_state(t):
        r = rows[t]
        lab = (f"<<table border='0' cellspacing='0' cellpadding='3'>"
               f"<tr><td align='left'><b>origin serves</b></td><td align='left'>{html.escape(r['current'])}</td></tr>"
               f"<tr><td align='left'>ever served</td><td align='left'>{html.escape(r['served'])}</td></tr>"
               f"<tr><td align='left'><b>reader watermark</b></td><td align='left'>{r['wm']}</td></tr>"
               f"<tr><td align='left'>reader stores</td><td align='left'>{html.escape(r['stored'])}</td></tr>"
               f"<tr><td align='left'>highest adopted</td><td align='left'>{r['hi']}</td></tr>"
               f"<tr><td align='left'>alarm</td><td align='left'>{html.escape(r['alarm'])}</td></tr></table>>")
        return ('digraph G { graph [bgcolor="transparent", pad=0.05]; node [shape=box, style="rounded,filled", fillcolor="#ffffff", '
                f'color="#5b5a55", fontname="Helvetica", fontsize=10]; s [label={lab}]; }}')

    return events, dot_for_state, policy


# ----------------------------------------------------------------- mentions instance
def mentions_dot(states):
    st = states[0]
    hosts = sorted({a for (a,) in rel(st, "Host")})
    hname = {h: ["example.com", "other.net", "third.org", "h4.io"][k] for k, h in enumerate(hosts)}
    ohost = fn(st, "host")
    origins = sorted({a for (a,) in rel(st, "Origin")})
    onames = {}
    for h in hosts:
        os_ = [o for o in origins if ohost[o] == h]
        for k, o in enumerate(os_):
            onames[o] = f"{hname[h]}/{['alice', 'bob', 'carol', 'dan'][k]}/" if len(os_) > 1 else f"{hname[h]}/blyg/"
    urls = sorted({a for (a,) in rel(st, "Url")})
    under = fn(st, "under"); serves = fn(st, "serves")
    claims = fn(st, "claims"); ditem = fn(st, "item"); dkind = fn(st, "kind"); pin = fn(st, "pin"); stub = fn(st, "stubOf")
    home = fn(st, "home")
    live = {i: u for (_, i, u) in rel(st, "at")}
    items = sorted({a for (a,) in rel(st, "Item")})
    iname = {it: "ABCDEFGH"[k] for k, it in enumerate(items)}
    sk = set()
    for k, vals in st.items():
        if k.startswith("$"):
            sk |= {x for tup in vals for x in tup}
    L = ['digraph G { graph [rankdir=LR, bgcolor="transparent", fontname="Helvetica", fontsize=10, pad=0.1];',
         'node [fontname="Helvetica", fontsize=10, shape=box, style="rounded,filled", fillcolor="#ffffff", color="#5b5a55"];',
         'edge [fontname="Helvetica", fontsize=9, color="#5b5a55", fontcolor="#5b5a55"];']
    for h in hosts:
        L.append(f'subgraph "cluster_{h}" {{ label="host {hname[h]}"; style="rounded,dashed"; color="#b9b4a7"; fontcolor="#5b5a55";')
        for o in origins:
            if ohost[o] == h:
                its = ", ".join(iname[i] for i in items if home[i] == o)
                L.append(f'"{o}" [label="origin {onames[o]}\\nitems: {its or "—"}", fillcolor="#f1efe9"];')
        for u in urls:
            if fn(st, "host")[u] == h:
                tag = [k for k, v in live.items() if v == u]
                lab = f"URL {short(u)}" + (f"\\nlive items/{iname[tag[0]]}.json" if tag else "")
                pen = 2.5 if u in sk else 1
                col = "#a23b3b" if u in sk else "#5b5a55"
                L.append(f'"{u}" [label="{lab}", shape=box, penwidth={pen}, color="{col}"];')
                if u in under:
                    L.append(f'"{u}" -> "{under[u]}" [label="inside mount of", style=dotted];')
        L.append("}")
    for u, d in serves.items():
        k = "endcap" if dkind[d].startswith("Withdrawn") else "thread"
        lab = f"doc {short(d)}\\n\\\"origin\\\": {onames[claims[d]]}\\nitem {iname[ditem[d]]} · {k}" + ("\\npin file" if d in pin else "") + \
              (f"\\nstub_of → {iname[stub[d]]}" if d in stub else "")
        fill = "#fbe3e3" if claims[d] != under.get(u) else "#ffffff"
        L.append(f'"{d}" [label="{lab}", fillcolor="{fill}", shape=note];')
        L.append(f'"{u}" -> "{d}" [label="serves"];')
    L.append("}")
    return "\n".join(L), onames, iname


def svg(dot_src):
    try:
        p = subprocess.run([DOT, "-Tsvg"], input=dot_src, capture_output=True, text=True, timeout=60)
        s = p.stdout
        s = s[s.find("<svg"):]
        s = re.sub(r'width="[\d.]+pt" height="[\d.]+pt"', lambda m: m.group(0) + ' class="g"', s, count=1)
        return s
    except Exception as e:  # graphviz missing
        return f"<pre>{html.escape(dot_src)}</pre><p>(dot failed: {html.escape(str(e))})</p>"


# ----------------------------------------------------------------- trace rendering
def render_trace(model, name, is_check):
    path = os.path.join(RAW, model, name, f"{name}-solution-0.xml")
    if not os.path.exists(path):
        return None, None
    states, meta = parse_trace(path)
    os.makedirs(os.path.join(OUT, "svg"), exist_ok=True)
    if model == "mentions":
        dsrc, _, _ = mentions_dot(states)
        s = svg(dsrc)
        if is_check:
            open(os.path.join(OUT, "svg", f"{name}.svg"), "w").write(s)
        return f'<div class="trace single">{s}</div>', "static instance"
    if model == "blygger":
        events, dfs = blygger_story(states)
        extra = ""
    else:
        events, dfs, policy = watermark_story(states)
        extra = f'<p class="small">Reader policy in this instance: <b>{policy}</b></p>'
    # the violation is observable from the state after the last change (traces are shortest-first)
    changed = [t for t in range(1, len(states)) if not events[t - 1].startswith("—")]
    bad = changed[-1] if (changed and is_check) else None
    loop = meta.get("backloop")
    cards = []
    for t in range(len(states)):
        s = svg(dfs(t))
        evt = "initial state" if t == 0 else html.escape(events[t - 1])
        cls = "step bad" if t == bad else "step"
        flag = '<span class="badge fail">violation visible</span>' if t == bad else ""
        cards.append(f'<figure class="{cls}"><figcaption><b>t{t}</b> {flag}<br><span class="ev">{evt}</span></figcaption>{s}</figure>')
        if t == bad and is_check:
            open(os.path.join(OUT, "svg", f"{name}.svg"), "w").write(s)
    narrative = "".join(f"<li><b>t{t}</b> {html.escape(e)}</li>" for t, e in enumerate(events, 1) if not e.startswith("—"))
    return extra + f'<ol class="story">{narrative}</ol><div class="trace">{"".join(cards)}</div>', f"{len(states)} states"


# ----------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reuse", action="store_true", help="do not re-solve; rebuild report from out/raw")
    ap.add_argument("--only", default="", help="comma-separated command names to (re)run")
    args = ap.parse_args()
    only = set(filter(None, args.only.split(",")))
    ensure_jar()
    all_cmds = {}
    for model in MODELS:
        for c in commands_in(model):
            all_cmds[c["name"]] = dict(c, model=model)
    for name, c in all_cmds.items():
        if args.reuse and not (only and name in only):
            continue
        if only and name not in only:
            continue
        print(f"[{c['model']}] {c['kind']} {name} …", end=" ", flush=True, file=sys.stderr)
        r = run_command(c["model"], name)
        print(("SAT" if r["sat"] else "UNSAT") + f" {r['seconds']}s" + (" ERROR" if r["error"] else ""), file=sys.stderr)
    build(all_cmds)


def status_for(chk, res, vac):
    if res is None:
        return "warn", "not run"
    if res.get("error"):
        return "fail", "Alloy error: " + res["error"][-300:]
    if chk["expect"] == "pass":
        if res["sat"]:
            return "fail", "UNEXPECTED counterexample. " + chk["cex_text"]
        if vac is not None and not vac["sat"]:
            return "warn", "No counterexample — but the non-vacuity run found no instance, so the check may be vacuous. " + chk["pass_text"]
        return "pass", chk["pass_text"]
    else:
        if res["sat"]:
            return chk["cex_status"], chk["cex_text"]
        return "warn", "Expected a counterexample but none was found within scope. " + chk["pass_text"]


def build(all_cmds):
    shutil.rmtree(os.path.join(OUT, "svg"), ignore_errors=True)
    checks_out, cards = [], []
    for chk in CHECKS:
        c = all_cmds.get(chk["cmd"])
        if c is None:
            raise SystemExit(f"command {chk['cmd']} not found in models/{chk['model']}.als")
        res = load_result(chk["model"], chk["cmd"])
        vac = load_result(chk["model"], chk["vacuity"]) if chk.get("vacuity") else None
        status, detail = status_for(chk, res, vac)
        scope = c["scope"]
        vac_txt = ""
        if chk.get("vacuity"):
            vc = all_cmds[chk["vacuity"]]
            vac_txt = (f"non-vacuity run {chk['vacuity']} ({vc['scope']}): "
                       + ("instance found" if vac and vac["sat"] else "NO instance"))
        found = bool(res and res["sat"])
        checks_out.append(dict(
            id=f"alloy.{chk['model']}.{chk['cmd']}", title=chk["title"], status=status,
            detail=(f"{'Counterexample found' if found else 'No counterexample'} — scope: {scope}. " + detail
                    + (f" [{vac_txt}]" if vac_txt else "")
                    + (f" Solve time {res['seconds']}s." if res else "")),
            spec_refs=chk["spec_refs"], decisions=chk["decisions"], clauses=chk["clauses"],
            model=f"models/{chk['model']}.als", command=chk["cmd"], scope=scope,
            counterexample=found, expected=("counterexample" if chk["expect"] == "fail" else "none"),
            **({"rule_set": {"a": "§5.6 alone", "b": "§5.6 + §16.6f (#57)"}[chk["rules"]]} if chk.get("rules") else {}),
        ))
        trace_html, _ = render_trace(chk["model"], chk["cmd"], True) if found else (None, None)
        vac_trace = None
        if not found and chk.get("vacuity") and vac and vac["sat"]:
            vac_trace, _ = render_trace(chk["model"], chk["vacuity"], False)
        cards.append((chk, status, detail, scope, res, vac_txt, trace_html, vac_trace))
    summary = dict(area="alloy", title="Alloy 6 model of the Blygger 0.3 rules",
                   generated_at=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
                   tool=f"Alloy {ALLOY_VERSION} ({SOLVER})", checks=checks_out)
    os.makedirs(OUT, exist_ok=True)
    json.dump(summary, open(os.path.join(OUT, "summary.json"), "w"), indent=2, ensure_ascii=False)
    open(os.path.join(OUT, "report.html"), "w").write(report(summary, cards))
    print(f"wrote {OUT}/summary.json and report.html", file=sys.stderr)


CSS = """
:root{--bg:#f6f4ef;--paper:#fff;--ink:#1d1d1b;--soft:#5b5a55;--rule:#dedad0;--accent:#2b5bab;--pass:#2f7a45;--warn:#a46a00;--fail:#a23b3b;--code:#f1efe9}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--paper:#1f1f1c;--ink:#ecebe6;--soft:#a9a79f;--rule:#3a3934;--accent:#7fa6e8;--pass:#6cc08a;--warn:#e0a640;--fail:#e07a7a;--code:#2a2a26}
 .trace svg, .single svg{background:#fbfaf6;border-radius:6px}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:1.6rem;margin:0 0 4px} h2{font-size:1.2rem;margin:32px 0 10px} h3{font-size:1.05rem;margin:0}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:16px;margin:12px 0;overflow:hidden}
.badge{display:inline-block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 8px;border-radius:999px;border:1px solid currentColor;margin-right:6px;vertical-align:middle}
.pass{color:var(--pass)} .warn{color:var(--warn)} .fail{color:var(--fail)} .info{color:var(--accent)}
.card.s-fail{border-left:4px solid var(--fail)} .card.s-warn{border-left:4px solid var(--warn)} .card.s-pass{border-left:4px solid var(--pass)} .card.s-info{border-left:4px solid var(--accent)}
.meta{color:var(--soft);font-size:.85rem;margin:6px 0}
code,pre{background:var(--code);border-radius:6px;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
code{padding:1px 5px} pre{padding:10px;overflow-x:auto}
blockquote{margin:8px 0;padding:6px 12px;border-left:3px solid var(--rule);color:var(--soft);font-size:.92rem}
.trace{display:flex;gap:10px;overflow-x:auto;padding:6px 0 10px;-webkit-overflow-scrolling:touch}
.trace.single{display:block}
.step{flex:0 0 auto;margin:0;border:1px solid var(--rule);border-radius:10px;padding:8px;background:var(--paper);max-width:92vw}
.step.bad{border:2px solid var(--fail)}
.step svg,.single svg{max-width:100%;height:auto;display:block}
figcaption{font-size:.8rem;color:var(--soft);margin-bottom:6px;max-width:420px}
.ev{color:var(--ink)}
.story{font-size:.9rem;padding-left:20px}
.small{font-size:.85rem;color:var(--soft)}
table.sum{border-collapse:collapse;width:100%;font-size:.9rem}
table.sum td,table.sum th{border-bottom:1px solid var(--rule);padding:6px 4px;text-align:left;vertical-align:top}
.wrap{overflow-x:auto}
details summary{cursor:pointer;color:var(--accent)}
.fable li{margin-bottom:8px}
"""


PAIRS = [("ForkFaithful", None, "Fork bakes what the pin baked"),
         ("ForkTextEqualsPin_CopyMd", "ForkTextEqualsPin_57", "Fork's text equals the pin's text"),
         ("ForkPreservesPartiality", "ForkQuotesFaithful_57", "Quoted text faithful (partials stay partial, nothing re-resolves)"),
         ("ForkSameTargets", "ForkQuotesFaithful_57", "Fork names the same quoted items"),
         ("ForkHonoursKnownWithdrawal_CopyMd", "ForkHonoursKnownWithdrawal_57", "Fork never re-publishes words the forker knows were withdrawn (unpinned)")]


def side_by_side(summary, cards):
    by = {c["command"]: c for c in summary["checks"]}

    def cell(name):
        if not name:
            return '<td class="small">— (no longer meaningful: nothing is baked)</td>'
        c = by[name]
        return f'<td>{badge(c["status"])} <a href="#{name}">{"counterexample" if c["counterexample"] else "no counterexample"}</a></td>'
    rows = "".join(f"<tr><td>{html.escape(t)}</td>{cell(a)}{cell(b)}</tr>" for a, b, t in PAIRS)
    return ('<p class="small">(a) = §5.6 as normative text alone: a fork copies content_md and re-resolves its directives. '
            '(b) = §5.6 + §16.6f / decision #57: a fork of a thread flattens the pinned content_html.</p>'
            f'<table class="sum"><tr><th>property</th><th>(a) §5.6 alone</th><th>(b) + #57</th></tr>{rows}</table>')


def badge(s):
    return f'<span class="badge {s}">{s}</span>'


def report(summary, cards):
    counts = {}
    for c in summary["checks"]:
        counts[c["status"]] = counts.get(c["status"], 0) + 1
    rows = "".join(
        f'<tr><td>{badge(c["status"])}</td><td><a href="#{c["command"]}">{html.escape(c["title"])}</a></td>'
        f'<td>{"yes" if c["counterexample"] else "no"}</td><td>{", ".join(c["spec_refs"])}</td></tr>'
        for c in summary["checks"])
    fable = "".join(f'<li><a href="#{chk["cmd"]}">{html.escape(chk["title"])}</a> — {html.escape(chk["fable"])}</li>'
                    for (chk, status, *_rest) in cards if chk.get("fable") and status in ("fail", "warn") and _rest[2] and _rest[2]["sat"])
    body = []
    current_model = None
    for chk, status, detail, scope, res, vac_txt, trace_html, vac_trace in cards:
        if chk["model"] != current_model:
            current_model = chk["model"]
            body.append(f'<h2>models/{current_model}.als</h2><p class="small">{html.escape(MODELS[current_model])}</p>')
        found = bool(res and res["sat"])
        quotes = "".join(f"<blockquote>{html.escape(q)}</blockquote>" for q in chk["spec"])
        body.append(f'''<section class="card s-{status}" id="{chk["cmd"]}">
<h3>{badge(status)}{html.escape(chk["title"])}</h3>
<div class="meta">Alloy: <code>{chk["cmd"]}</code> · scope <code>{html.escape(scope)}</code> · {('counterexample found' if found else 'no counterexample')}
{f" · {res['seconds']}s" if res else ""} · expected: {"a counterexample" if chk["expect"] == "fail" else "none"}</div>
{f'<div class="meta"><b>Rule set {chk["rules"]}:</b> {"§5.6 as normative text alone" if chk["rules"] == "a" else "§5.6 + §16.6f / decision #57 (fork flattens the pinned document)"}</div>' if chk.get("rules") else ""}
<div class="meta">{", ".join(chk["spec_refs"])} · decisions {", ".join(chk["decisions"])} · clauses {", ".join(chk["clauses"])}</div>
{quotes}
<p>{html.escape(detail)}</p>
{f'<p class="small">{html.escape(vac_txt)}</p>' if vac_txt else ""}
{f'<h4>Counterexample trace</h4>{trace_html}' if trace_html else ""}
{f'<details><summary>Show a representative instance (non-vacuity run)</summary>{vac_trace}</details>' if vac_trace else ""}
</section>''')
    primer = """
<ul>
<li><b>sig</b> declares a kind of thing (Origin, Item, Version…); a <b>field</b> is a relation between things.
<b>var</b> fields and sigs change over time; everything else is fixed for the whole trace.</li>
<li>A <b>fact</b> is a rule the model always obeys — here, each fact is a spec rule, tagged with § and decision.</li>
<li>A <b>pred</b> is a named condition; the events (<code>publish</code>, <code>pin</code>, <code>withdraw</code>, <code>poll</code>…) are preds relating a state to the next (<code>x'</code> = x in the next state).</li>
<li>An <b>assert</b> is a property we believe the rules guarantee. <code>check</code> asks the solver to find a <b>counterexample</b>: a trace obeying every fact where the assertion is false.</li>
<li><b>Scope</b> bounds the search (e.g. "3 Item, 6 Version, 1..8 steps"). No counterexample means none exists <i>within that scope</i> — not a proof, but small scopes find almost all design bugs (the "small scope hypothesis").</li>
<li><code>run</code> asks for an example instead. Every passing check has a run beside it showing its situation can actually happen; if that run found nothing the check would be vacuous.</li>
<li>Operators: <code>.</code> join (follow a relation), <code>^r</code>/<code>*r</code> transitive (reflexive) closure, <code>always</code>/<code>eventually</code>/<code>once</code> temporal, <code>=&gt;</code> implies.</li>
<li>In the traces below each card is one moment (t0, t1, …). Double-bordered boxes are pinned versions, red boxes are endcaps, a thick red border marks the atom the solver used as its witness, and the card outlined in red is where the violation becomes visible.</li>
</ul>"""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blygger Alloy Model</title><style>{CSS}</style></head><body><main>
<h1>Blygger 0.3 — Alloy model</h1>
<p class="small">Generated {summary["generated_at"]} · {html.escape(summary["tool"])} · {len(summary["checks"])} checks:
{" · ".join(f"{badge(k)}{v}" for k, v in sorted(counts.items()))}</p>
<div class="card"><p>This is a bounded model of the rules in <code>docs/protocol-v0.3.md</code>, written in Alloy 6, run by a SAT solver
that searches every possible history up to a size bound for one that breaks a property. <b>pass</b> = no counterexample within the stated scope;
<b>fail</b> = a counterexample that is a real problem with the spec text; <b>warn</b> = a counterexample that turns on an ambiguity, a reading or
a wording; <b>info</b> = a counterexample showing behaviour the spec chose deliberately (shown so its cost is visible).</p>
<p>Regenerate: <code>python3 conformance/alloy/run.py</code> (≈15 min; <code>--reuse</code> rebuilds this page without re-solving).
Explore interactively: <code>/opt/homebrew/opt/openjdk@17/bin/java -jar conformance/alloy/vendor/org.alloytools.alloy.dist.jar</code>,
then File → Open <code>conformance/alloy/models/blygger.als</code>, pick a command from the Execute menu, and use the visualiser's
→ arrow to step through time.</p></div>
<h2>For Fable</h2><div class="card"><ol class="fable">{fable or "<li>Nothing.</li>"}</ol></div>
<h2>Forks: two rule sets side by side</h2><div class="card wrap">{side_by_side(summary, cards)}</div>
<h2>Summary</h2><div class="card wrap"><table class="sum"><tr><th>status</th><th>check</th><th>counterexample</th><th>spec</th></tr>{rows}</table></div>
<h2>How to read Alloy (ten lines)</h2><div class="card">{primer}</div>
{"".join(body)}
</main></body></html>"""


if __name__ == "__main__":
    main()
