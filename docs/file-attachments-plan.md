# File attachments (PDF and a few other formats) — plan

**Status:** a plan, not built. Session 90 (2026-11-27), Opus 5.5, from Venkat's question the same
day ("can we do file uploads into blygs the way we do media uploads, … a few formats like pdf, with
adequate security?"). A client feature: the spec already allows it (§5.4), so no ruling is needed
for the studio. One optional Fable edit is listed in §6. Sequenced after the Agentic digest
release.

## 1. What it is

An owner attaches a file (PDF first) to an item the way they attach an image today. The item's
page shows it as a download link with its name, type and size, and its item document lists it in
`media[]` with its real MIME type. Readers get the file. The blyg never renders it.

## 2. What exists and carries over unchanged

The media pipeline (studio `src/api.ts` `uploadMediaOperation`, `src/index.ts` `serveMedia`)
already does most of what a file needs:

- bytes in R2, addressed by content digest (`media/{id}/{sha256}.{ext}`), so a published file
  never changes (§5.4's immutability);
- per-version attachment lists (`version_media`, migration 0031): an old version keeps its files;
- visibility: an unpublished item's or private item's media answers only the owner's session or a
  token that sees private (`privateItemHidden`), with `Cache-Control: no-store`; only media that
  published items use is publicly cached;
- every media response already carries `Content-Security-Policy: sandbox; script-src 'none'` and
  `X-Content-Type-Options: nosniff` (the SVG hardening);
- duplicate uploads to the same item are one row (studio#7).

## 3. What changes

1. **An allow-list for files beside the image one.** `application/pdf` first, maybe `text/plain` and
   `application/epub+zip` later. Each type has its own size limit: images stay at 5 MB, files get
   about 25 MB.
2. **Types checked by content, not by the browser's label.** Today the type comes from the upload's
   `Content-Type`. For a file it must match the bytes too: `%PDF-` at offset 0 for PDF, the zip
   signature plus `mimetype` = `application/epub+zip` for EPUB, valid UTF-8 for text. A mismatch is
   refused with 415, so an HTML or script file cannot be uploaded under a PDF label.
3. **Served as a download.** File responses add
   `Content-Disposition: attachment; filename*=UTF-8''<name>`, with the name sanitized (no path,
   no control characters, at most 120 characters, always ending in the type's extension). The file
   opens in the reader's own viewer and never as a document on the blyg's origin. The sandbox CSP
   and `nosniff` stay. (Chrome refuses to show a PDF inline under `sandbox` anyway, so "attachment"
   is both the safe answer and the one that works.)
4. **The file's name is stored.** A new `media.filename` column holds the uploaded name (one
   migration) for the disposition header and the card. Images ignore it.
5. **No server-side parsing.** No thumbnails, page counts or text extraction, so the Worker has no
   PDF-parser attack surface. A card shows the name, type and size from metadata only.
6. **Editor and pages.** The upload button and drop target accept the file types. A file inserts a
   link line (`[report.pdf](media url)`), not an image, and the attachments list shows a file row.
   Public pages draw the link as a file card: an icon by type, the name, the size, and "download".
   Feeds carry the link like any other.
7. **The item document** lists the file in `media[]`: `{ url, mime: "application/pdf", alt }`, with
   `alt` the file's name unless the owner writes one.

## 4. Security, plainly

What protects the blyg and its readers:

- content-checked types, so a disguised HTML or script file is refused;
- attachment disposition, the sandbox CSP and `nosniff`, so a file never runs or renders on the
  blyg's origin;
- no parsing on the Worker;
- the existing visibility rules, so private or unpublished files stay the owner's;
- immutable digest URLs, so a published file cannot be swapped.

What remains is the risk any download carries: a malicious PDF aimed at a reader's PDF viewer.
Nothing on the Worker can scan for it (there is no antivirus to call), and the reader opens it in
their own viewer, as they would from any site. The upload is the owner's (or a token with
`owner:draft`, plus `owner:publish` to attach to a published item), so the source is the blyg's
own author.

## 5. Oracle first (design for CI)

The media-visibility oracle owns serving today. Extend it, or add a `media-files` oracle, with laws
like these:

- for every upload, a file is stored if and only if its declared type is allowed and its bytes
  match that type;
- for every file response, the disposition is attachment with a sanitized name, and the sandbox
  CSP and `nosniff` are present;
- file visibility follows the item's, as image visibility does today.

Histories cover disguised types (HTML under a PDF label, a PDF under an image label), names with
path separators, control characters and long Unicode, and every visibility state.

## 6. Cross-client note (optional, Fable)

§5.4 does not limit `media[]` to images; its wording only uses "image" as the example. Another
client that assumes every entry is an image would draw a broken `<img>`. A one-sentence
clarification would settle it: "a reader draws the types it knows and links the rest". So would a
note on blyg.blygger.org when the feature ships. Neither blocks the build.

## 7. Size and cost

R2 storage and class-A writes per upload; no D1 cost beyond one `media` row. Downloads are R2
reads plus one Worker request, cached at the edge for published files.

## 8. Build order

1. The oracle (§5), red against today's code: a disguised file is accepted today.
2. Content checks and the file allow-list, with the size limits.
3. The `media.filename` migration, and the disposition header.
4. Editor (upload, insert as link), the attachments list, and the public file card.
5. A release note, and the cross-client note (§6).
