#!/usr/bin/env python3
"""Regenerate everything in conformance/clauses/ — the one command.

    python3 conformance/clauses/build.py

Runs, in order: extract.py (clauses.json, ids.lock.json), decisions.py
(decisions.json), analyze.py (out/graph.json, out/analysis.json,
out/summary.json), report.py (out/report.html). Stdlib only.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze  # noqa: E402
import decisions  # noqa: E402
import extract  # noqa: E402
import report  # noqa: E402

if __name__ == "__main__":
    for step in (lambda: extract.main([]), lambda: decisions.main([]), analyze.main, report.main):
        rc = step()
        if rc:
            sys.exit(rc)
