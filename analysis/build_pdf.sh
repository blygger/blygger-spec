#!/bin/sh
# Build the PDF of the briefing from its markdown: pandoc -> HTML -> weasyprint.
# Usage: ./build_pdf.sh [commerce-in-the-thicket-v5.md]
set -e
cd "$(dirname "$0")"
SRC="${1:-commerce-in-the-thicket-v5.md}"
OUT="${SRC%.md}.pdf"
TMP="$(mktemp -d)"
# Explicit ids for the appendix anchors the text links to.
sed -e 's/^## Appendix \([A-D]\)\. \(.*\)$/## Appendix \1. \2 {#appendix-\1}/' \
    -e 's/^### A\.4\. A worked encounter$/### A.4. A worked encounter {#a4-a-worked-encounter}/' "$SRC" \
  | sed -e 's/{#appendix-A}/{#appendix-a}/; s/{#appendix-B}/{#appendix-b}/; s/{#appendix-C}/{#appendix-c}/; s/{#appendix-D}/{#appendix-d}/' > "$TMP/build.md"
pandoc "$TMP/build.md" -f markdown-implicit_header_references -t html5 -s \
  --metadata pagetitle="Commerce in the Thicket" -o "$TMP/build.html"
cp -R figures "$TMP/figures"
weasyprint -s pdf.css "$TMP/build.html" "$OUT"
rm -rf "$TMP"
echo "wrote $OUT"
