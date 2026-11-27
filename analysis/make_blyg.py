"""Turn the briefing's markdown into a Blygger Studio tangle source.

Output: <stem>-blyg.md, one thread whose executive summary stays in the root and
whose ten parts are `![[+ ... ]]` spans (Studio TANGLE_MAX is 10), plus
<stem>-blyg-figures.md, the figures to attach to each part's thread in its
second version (a span cannot carry an attached image, studio src/tangle.ts).

Usage: /opt/homebrew/bin/python3 make_blyg.py [commerce-in-the-thicket-v5.md] [--pdf URL]
"""
import re, sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith("--")]
pdf = sys.argv[sys.argv.index("--pdf") + 1] if "--pdf" in sys.argv else None
if pdf in args: args.remove(pdf)
src = Path(args[0] if args else "commerce-in-the-thicket-v5.md")
text = src.read_text()

# Split on level-2 headings.
chunks = re.split(r"(?m)^(?=## )", text)
head, rest = chunks[0], chunks[1:]
def title(c): return c.splitlines()[0][3:].strip()

exec_summary = [c for c in rest if title(c) == "Executive summary"]
parts, current = [], None
for c in rest:
    t = title(c)
    if t == "Executive summary":
        continue
    if re.match(r"^[IVX]+\. ", t) or t == "Conclusion":
        current = [c]; parts.append(current)
    elif t.startswith("Appendix A"):
        current = [c]; parts.append(current)
    else:
        current.append(c)   # Appendix B-D and Endnotes join the appendix part
assert len(parts) == 10, [p[0].splitlines()[0] for p in parts]

FIG = re.compile(r"(?m)^!\[(Figure \d+\.[^\]]*)\]\((figures/[^)]+)\)\n?")
ANCHOR = re.compile(r"\[([^\]]+)\]\(#[^)]+\)")

def clean(s):
    s = ANCHOR.sub(r"\1", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

figures = []
out = [clean(head)]
if pdf:
    out.append(f"PDF edition: [{pdf}]({pdf})")
out.append(clean("".join(exec_summary)))
for i, p in enumerate(parts, 1):
    body = "".join(p)
    figs = FIG.findall(body)
    if figs:
        figures.append((title(p[0]), figs))
    body = clean(FIG.sub("", body))
    # A span closes at the first `]]` ending a line; none may appear inside.
    for n, line in enumerate(body.splitlines()):
        assert not line.rstrip().endswith("]]"), (i, n, line)
    out.append("![[+\n" + body + "\n]]")

dst = src.with_name(src.stem + "-blyg.md")
dst.write_text("\n\n".join(out) + "\n")
figs_md = ["# Figures to attach in each part's second version", ""]
for t, figs in figures:
    figs_md.append(f"## {t}")
    for cap, path in figs:
        figs_md.append(f"- `{path}`: {cap}")
    figs_md.append("")
src.with_name(src.stem + "-blyg-figures.md").write_text("\n".join(figs_md))
print("wrote", dst, "with", len(parts), "spans;", sum(len(f) for _, f in figures), "figures deferred")
