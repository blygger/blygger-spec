# RENAME.md — brand-rename checklist

Task 16 in `docs/v0.1-plan.md` (§5) called for pulling every occurrence of the
project name into one place so a rename would be a constants edit, not an
archaeology dig. The rename happened for real in session 6 (2026-07-24,
`ygg` → `blygger`, default publish path `/ygg/` → `/blygg/`), so this doc now
serves two purposes: the completed record of that rename, and the checklist
for the handful of things that live outside `worker/src/types.ts`'s `BRAND`
constant and had to be (or still need to be) changed by hand.

## What the `BRAND` constant covers (automatic — see `worker/src/types.ts`)

`BRAND = { name: "blygger", slug: "blygg", nsUri: "https://blygger.org/ns/0.1" }`
drives: manifest filename (`blygg.json`), JSON version key (`"blygg": "0.1"`),
GUID scheme (`blygg:{id}:v{n}`), XML namespace prefix + `blygg:*` element
names, `GENERATOR` string, and (via a literal `blygg-`/`.blygg` value applied
directly rather than re-imported at every call site — see *Scope trim* below)
CSS class prefix and cookie name. `PROTOCOL_VERSION`/`PROTOCOL_LEVEL` are
brand-neutral and untouched by a rename.

**Amendment (session 8, locked decision #14):** the URL path prefix is no
longer brand-derived at all. The *mount* is deployment config — `Env.MOUNT`
wrangler var, default `DEFAULT_MOUNT = "/blyg"` in `types.ts`, `""` = domain
root — threaded through routing and link generation as a parameter, never a
literal. A future rename touches wire tokens only; the mount renames with a
one-line config edit per deployment (which also retires the session-6
`ygg`-inside-`blygg` sed hazard for paths).

**Scope trim from the original task-16 wording (recorded, not silent):**
the plan's acceptance check was "change the brand constant to `zzz`, full
suite still passes." That check made sense while the name was still
speculative. Now that Venkat has picked a final name, full constant-import
purity in `pages.ts`/`studio.ts`/`transclusion.ts` (which interpolate literal
`/blygg/` links and `blygg-transclusion`/`.blygg` CSS classes directly rather
than importing `BRAND.slug` at each of ~40 call sites) wasn't worth doing —
the rename itself is what mattered, and it's done and verified (`tsc
--noEmit` clean, 57/58 tests passing — the one failure is the pre-existing
`feed.test.ts` timestamp-ordering flake, unrelated to the rename, see
CLAUDE.md TODO). A future rebrand would need a second sed pass over those
three files, not just an edit to `BRAND`.

## Config files (can't import constants — done this session)

- [x] `worker/wrangler.jsonc` — worker `name`, D1 `database_name`, R2
      `bucket_name` → `blygg`
- [x] `worker/package.json` — `name` → `blygg-ref`, `description` updated
- [x] `worker/package-lock.json` — `name` fields matched to `package.json`

## Repo/infra (one-shot manual — session 6 status)

- [x] Local folder: `Code/ygg/` → `Code/blygger-protocol/blygger-spec/`
- [x] GitHub repo: `vgururao/ygg` → `blygger/blygger-spec`
- [x] `Code/CLAUDE.md` project-table entry updated for the new path + the
      two new sibling repos (`blygger-org`, `blygger-com`)
- [ ] D1/R2 instance names at deploy time (task 11, still pending — not a
      rename artifact, just hasn't happened yet)

## Docs prose (done this session, with two deliberate exceptions)

- [x] `CLAUDE.md`, `README.md`, `docs/v0.1-plan.md`, `docs/roadmap.md`,
      `docs/proposals/*.md` — find/replaced `ygg` → `blygg`/`blygger` as
      appropriate (path/machine tokens → `blygg`, brand-name prose →
      `blygger`)
- [x] `docs/wireframes/*.html` — mockups updated to match (not historical
      artifacts in the DEVLOG sense; kept in sync with the live product)
- [ ] **`docs/ygg-initial-spec.md` — deliberately NOT edited.** Frozen v0
      concept spec, open for public comment (issue #1); keeps the historical
      `ygg` name permanently, with a banner note at the top explaining why.
- [ ] **`DEVLOG.md` — session entries are NOT rewritten.** It's a
      chronological log; past sessions correctly say `ygg` because that was
      the name at the time. Only the top title and the session-6 entry
      itself use `blygger`. Rewriting history here would falsify the record.

## If this ever happens again

1. Confirm the new `name`/`slug`/`nsUri` with Venkat first (this is a
   ⚠️ FABLE-adjacent decision the first time — namespace URI is permanent
   protocol surface once importers ship).
2. Run the blind case-sensitive sed pass **before** any hand-written text
   containing the new brand strings exists in any file (the new slug/name
   will almost certainly contain the *old* slug as a substring — `ygg` is
   inside `blygg`/`blygger` — so sed run *after* hand-edits will corrupt
   them; this bit us mid-refactor and is why the ordering matters):
   `sed -i '' 's/old/new/g; s/OLD/NEW/g'` across `worker/src`, `worker/test`,
   `worker/scripts`, `wrangler.jsonc`, `package.json`, `package-lock.json`,
   `docs/*.md` (except the two exceptions above), `docs/wireframes/*.html`.
3. Hand-fix: `types.ts`'s `BRAND` block, the real namespace URI, and any
   title-case prose the case-sensitive sed missed.
4. `tsc --noEmit` + `vitest run`; expect exactly the pre-existing
   `feed.test.ts` flake and nothing else.
5. Repo/folder rename, `Code/CLAUDE.md` update, new DEVLOG entry.
