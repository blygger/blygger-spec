# Spec publishing plan — keeping blygger.org/spec/ current

**Status:** PLAN, not executed. Written session 8 (2026-08-04, Fable) after the
spec-as-blygg question was decided (see §1). **Sonnet/Opus-safe to execute in
full** — scripting and site plumbing, no protocol semantics. The one ⚠️ FABLE
boundary: do not change the URL scheme, the snapshot/tag convention, or the
source-of-truth direction (§2) — those are the decision; everything else here
is implementation detail where local judgment is fine.

**Coordination note:** most tasks edit `blygger-org/`. Another agent has been
active in that repo (site build + stale-copy re-sync, 2026-08-04); before
starting, confirm it has wrapped and `git status` there is clean.

## 1. Decision being implemented (record)

The spec is **not** published as an evolving blygg. Three reasons, recorded so
it isn't relitigated: (a) spec URLs must be semantic and citable
(`/spec/0.1/`), blygg item URLs are deliberately identity-opaque (`t/{id}/`);
(b) a 500-line normative document is the wrong shape for fragment/thread
primitives; (c) the normative text must be retrievable by the dumbest possible
mechanism, not through the machinery it defines. Deferred, not rejected: a
blygger.org *announcements* blygg (each spec revision = a fragment linking to
the semantic URL) once v0.2 subscribe exists, and a ceremonial pin of the
frozen 1.0 spec text. The archive itself is never a blygg.

Instead: W3C-/TR-style dated snapshots + git-tag coordination, below.

## 2. Architecture (locked shape)

```
blygger-spec (GitHub: blygger/blygger-spec)          blygger-org (GitHub: blygger/blygger-org)
docs/protocol-v0.1.md  ── sync_spec.py ──► content/spec/0.1/index.md        (latest, mutable while DRAFT)
        │                    (snapshot mode) ──► content/spec/0.1/YYYY-MM-DD/index.md  (immutable)
   git tag spec/0.1/YYYY-MM-DD                        │ build.py
   (created at each snapshot cut)                     ▼
                                                    dist/ ── deploy.sh ──► Cloudflare Pages
```

- **URL scheme:** `/spec/` = index of all spec versions with status table;
  `/spec/0.1/` = latest revision of the 0.1 spec (tracks canonical while
  DRAFT; freezes except errata when 0.1 is declared stable); `/spec/0.1/
  YYYY-MM-DD/` = immutable dated snapshots. New protocol versions get new
  slugs (`/spec/0.2/`) alongside, never replacing.
- **Source of truth:** canonical spec stays `blygger-spec/docs/
  protocol-v0.1.md`, edited only there (git is the editorial substrate).
  Everything under `blygger-org/content/spec/` is **generated** — the sync
  script is the only writer; hand-editing is prohibited and the generated
  files say so in a banner comment.
- **Repo⇄site coordination:** every dated snapshot on the site corresponds to
  a git tag `spec/0.1/YYYY-MM-DD` in `blygger-spec` at the exact commit
  published. Every published page (latest and snapshots) carries a footer
  provenance stamp: `Published from blygger/blygger-spec@{short-sha}` linking
  to the commit on GitHub. Diffs between snapshots = GitHub compare URLs
  between tags. Reference-implementation releases are deliberately **loosely
  coupled**: `ref-vX.Y.Z` tags + GitHub Releases in `blygger-spec` (starts at
  task 11); the site links to stable `/releases/latest` URLs so repo releases
  never force site deploys and spec snapshots never force repo releases.
- **Snapshot policy:** cutting a snapshot is a deliberate editorial act (like
  pinning) — on substantive normative change or status transition, not typo
  fixes. Latest may re-sync freely while DRAFT.
- **Sync direction is local-first** (matches the existing deploy mechanics:
  `blygger-org` Pages is direct-upload via `deploy.sh`, not git-connected;
  both repos sit side-by-side in `blygger-protocol/`). CI automation is a
  recorded upgrade path (§4), not part of this plan.

## 3. Tasks (ordered; each is a commit-sized unit with its acceptance check)

1. **Secret hygiene in `blygger-org/deploy.sh` (do first — policy fix).**
   `deploy.sh` currently hardcodes a Cloudflare API token + account id. It is
   gitignored and was never committed or pushed (verified session 8 against
   `git ls-files`, full history, and the remote) — no exposure, no rotation
   required — but hardcoding violates `Code/warnings-keys.md`. Change
   `deploy.sh` to read both values from `Code/.env.keys` (follow that file's
   existing variable-naming and sourcing conventions; error out with a clear
   message if unset), register the token there per the `warnings-keys.md`
   inventory procedure, and keep `deploy.sh` gitignored anyway.
   ✓ `deploy.sh` contains no secret material; `bash -n` clean; a deploy from a
   shell without the env var fails with the explanatory error; token
   registered in `.env.keys`.

2. **`blygger-org/sync_spec.py` — the only writer of `content/spec/`.**
   `/opt/homebrew/bin/python3`, stdlib only. Reads the canonical spec from the
   sibling checkout (`../blygger-spec/docs/protocol-v0.1.md`; resolve relative
   to the script, error clearly if missing). Two modes:
   - `sync_spec.py` (default, latest): copy the spec body verbatim, rewriting
     only the marked header-links block (task 4) to: This version →
     `https://blygger.org/spec/0.1/`; Latest version → same; Previous
     version → most recent snapshot URL (omit the line if none exist).
     Append the footer provenance stamp with the current `blygger-spec` HEAD
     short-sha (via `git -C ../blygger-spec rev-parse --short HEAD`) linking
     to the commit on GitHub, and warn loudly (but proceed) if that tree is
     dirty. Prepend an HTML banner comment: generated file, do not edit,
     edit canonical + rerun.
   - `sync_spec.py snapshot`: **requires** a clean `../blygger-spec` tree
     (refuse otherwise — a snapshot must correspond to a pushed commit).
     Date = today UTC. Writes `content/spec/0.1/YYYY-MM-DD/index.md` with
     This version → the dated URL, Latest version → `/spec/0.1/`, Previous
     version → the prior snapshot; refuses to overwrite an existing snapshot
     dir (immutability). Creates and pushes git tag `spec/0.1/YYYY-MM-DD` in
     `blygger-spec` (refuse if the tag exists on a different commit; no-op if
     identical). Then regenerates latest so its Previous-version link
     updates.
   - Snapshot inventory is derived by globbing `content/spec/0.1/*/` —
     stateless, no manifest file to corrupt.
   ✓ run latest-mode twice → idempotent (byte-identical output); snapshot
   dry-run on a dirty tree refuses; snapshot on a clean tree produces the
   dated dir + tag, and a second identical run is a clean no-op.

3. **`/spec/` index page, generated.** `sync_spec.py` also (re)writes
   `content/spec/index.md`: a table of spec versions (version, status
   DRAFT/stable/frozen, latest-revision link, snapshot list with dates →
   dated URLs, GitHub compare link between consecutive snapshots), a link to
   the `blygger/blygger-spec` repo, and a "Reference implementation" section
   that links to the repo's Releases page — with a note that release links
   activate when task 11 ships `ref-v0.1.0`. Status values come from a small
   constants block at the top of `sync_spec.py` (currently: `0.1: DRAFT`) —
   flipping 0.1 to stable at freeze time is a one-line edit.
   ✓ index renders with the 0.1 row, any existing snapshots listed
   newest-first, and valid GitHub URLs.

4. **Markers in the canonical spec (`blygger-spec` edit — markers only, no
   prose change).** Wrap the existing header bullet block in
   `docs/protocol-v0.1.md` (the "This version / XML namespace / Source of
   truth / Reference implementation / License" list) in HTML comments
   `<!-- spec-links:begin -->` / `<!-- spec-links:end -->` so the sync
   script's rewrite is surgical rather than heuristic. The canonical file
   keeps its own copy of the block (git readers still see correct links);
   the script replaces the block's contents only in the publish copies.
   ✓ sync produces correct link blocks; canonical file diff shows only the
   two marker lines.

5. **Wire into build + deploy.** `deploy.sh` runs `sync_spec.py` (latest
   mode) before `build.py`. Verify `build.py` renders nested snapshot dirs
   (`content/spec/0.1/YYYY-MM-DD/index.md` → `dist/spec/0.1/YYYY-MM-DD/
   index.html`) and the generated `/spec/` index; fix its walker if it
   doesn't recurse. ✓ full `./deploy.sh` from a fresh shell publishes latest
   + index + snapshots; spot-check the three URL shapes on the live site.

6. **Docs.** Update `blygger-org/content/README.md` (source-of-truth rule is
   now script-enforced; hand-copying is retired), `blygger-org/CLAUDE.md`
   (sync/snapshot how-to for future sessions), `blygger-org/status.md`, and
   in `blygger-spec/CLAUDE.md`: tick the re-sync TODO, add this plan to the
   doc map, and note the snapshot ritual next to the freeze-at-stable TODO.
   ✓ a future session can cut a snapshot from the docs alone.

7. **First real snapshot.** After tasks 2–6: cut `spec/0.1/` snapshot №1 —
   this becomes the citable baseline carrying the session-8 mount-independence
   revision. ✓ dated URL live; tag pushed; index lists it; latest's
   Previous-version link points at it.

## 4. Explicitly out of scope (recorded upgrade paths, do not build now)

- **CI push-on-merge**: a GitHub Action in `blygger-spec` that runs the sync
  + deploy on merge (needs the CF token as a GH secret, or moving the Pages
  project to git-connected). Worth doing when deploys stop being local-first;
  the script's modes are designed to be CI-callable unchanged.
- **Announcements blygg** on blygger.org (v0.2+, needs subscribe to be worth
  it) and the ceremonial 1.0 pin — see §1.
- **Release automation** for the reference client (`ref-v*` tagging, GitHub
  Releases assets) — belongs to task 11 / the deploy sessions, not here. This
  plan only reserves the tag namespace and the index section.
