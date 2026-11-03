#!/usr/bin/env node
// Reader-suite adapter for blygger-studio: a batch renderer command.
//
//   STUDIO_DIR=/path/to/blygger-studio node adapters/studio/adapter.mjs < cases.json
//
// Reads { cases: [...] } on stdin (README.md, "The renderer protocol") and
// prints { renderer, results: [...] } on stdout. Progress goes to stderr.
//
// How it renders a case, using only the studio's public surfaces:
//   1. boot the studio in process (conformance/lib/studio-boot.mjs, shared
//      with the schemas/ harness) at the fixtures' own origin,
//      https://home.example/, with fake remote blygs behind it (remote.mjs);
//   2. publish every local item the corpus names, in dependency order,
//      through the owner REST contract, and subscribe to every remote origin
//      so its items are imported (a withdrawn item is first imported live,
//      then withdrawn, so a pin can be retained);
//   3. for each case: create the item, generate each TK scope that has output
//      (the fake provider answers with the fixture's own output text), publish,
//      and read the published item document, `items/{id}.json`, the wire.
//
// The studio mints its own ids, so fixture ids of local items are mapped to
// minted ids on the way in and back on the way out.
//
// The checkout must have run `npm ci && npm run build`. STUDIO_DIR defaults
// to ../blygger-studio beside this repository.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootStudio } from "../../../lib/studio-boot.mjs";
import { fakeRemotes } from "./remote.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studioDir = resolve(process.env.STUDIO_DIR || join(here, "..", "..", "..", "..", "..", "blygger-studio"));
const log = (...a) => console.error("[studio]", ...a);
const input = JSON.parse(readFileSync(0, "utf8"));
const cases = input.cases || [input];
const ORIGIN = cases[0]?.self?.origin || "https://home.example/";

// ── Gather the world ────────────────────────────────────────────────────────
const locals = new Map(), remotes = new Map();
for (const c of cases) for (const it of c.items) (it.local ? locals : remotes).set(`${it.origin}${it.id}`, it);
const remote = fakeRemotes([...remotes.values()]);
const s = await bootStudio(studioDir, { origin: ORIGIN, outbound: remote.outbound });
log(`blygger-studio ${s.version} booted from ${studioDir}`);
// TK generation refuses to run until a model is chosen; the fake provider
// answers whatever model is named.
{
  const r = await s.api("PATCH", "/settings", { aiModel: "claude-sonnet-5-5", aiModelTk: "claude-sonnet-5-5" });
  if (r.status >= 300) log(`could not set the AI model (${r.status}): generation cases will fail`);
}

const idMap = new Map(); // fixture id -> minted id
const mapIn = (md) => { let out = md; for (const [f, m] of idMap) out = out.split(f).join(m); return out; };
const mapOut = (v) => { let out = JSON.stringify(v); for (const [f, m] of idMap) out = out.split(m).join(f); return JSON.parse(out); };
const errText = (r) => (typeof r.json === "string" ? r.json : JSON.stringify(r.json)).slice(0, 400);

async function create(kind, contentMd) {
  const r = await s.api("POST", "/items", { kind, contentMd });
  if (r.status >= 300) throw new Error(`createItem ${r.status}: ${errText(r)}`);
  return r.json;
}
const publish = (id) => s.mutate("POST", `/items/${id}/publish`, id);
async function edit(id, contentMd) {
  const r = await s.mutate("PATCH", `/items/${id}`, id, { contentMd });
  if (r.status >= 300) throw new Error(`updateItem ${r.status}: ${errText(r)}`);
}

// ── Local items, in dependency order ───────────────────────────────────────
const pending = [...locals.values()].filter((it) => !it.needs_self);
const localIds = new Set(pending.map((it) => it.id));
while (pending.length) {
  const i = pending.findIndex((it) => ![...localIds].some((other) => other !== it.id && !idMap.has(other) && (it.content_md || "").includes(other)));
  if (i < 0) throw new Error("local items reference each other in a cycle");
  const [it] = pending.splice(i, 1);
  const kind = it.kind === "withdrawn" ? "fragment" : it.kind;
  const md = it.history?.[0]?.content_md ?? it.content_md;
  const made = await create(kind, mapIn(md));
  idMap.set(it.id, made.id);
  if (it.state === "draft") continue;
  const p = await publish(made.id);
  if (p.status >= 300) throw new Error(`publishing local ${it.id}: ${p.status} ${errText(p)}`);
  if (it.state === "withdrawn") {
    const w = await s.mutate("POST", `/items/${made.id}/withdraw`, made.id);
    if (w.status >= 300) throw new Error(`withdrawing local ${it.id}: ${w.status} ${errText(w)}`);
  }
}
log(`${idMap.size} local item(s) seeded`);

// ── Remote origins: subscribe, import live, then withdraw and resync ────────
const subs = [];
async function importedIds() {
  const ids = new Map();
  let cursor;
  do {
    const r = await s.api("GET", `/reading/imported?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    if (r.status >= 300) throw new Error(`listImportedReading ${r.status}: ${errText(r)}`);
    for (const e of r.json.items) ids.set(`${e.origin}${e.remoteId}`, e);
    cursor = r.json.page?.nextCursor;
  } while (cursor);
  return ids;
}
async function waitFor(pred, what) {
  for (let i = 0; i < 100; i++) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  log(`timed out waiting for ${what}`);
}
for (const origin of remote.origins) {
  const r = await s.api("POST", "/subscriptions", { url: origin, confirm: true });
  if (r.status >= 300) throw new Error(`subscribing to ${origin}: ${r.status} ${errText(r)}`);
  subs.push(r.json.id ?? r.json.subscription?.id);
}
await waitFor(async () => { const got = await importedIds(); return [...remotes.keys()].every((k) => got.has(k)); }, "remote imports");
if ([...remotes.values()].some((it) => it.history)) {
  // The studio retains a pinned version past withdrawal only for items its
  // owner curated into a hopper (src/importer/poll.ts; retention is a MAY,
  // §13.4). A fixture that says the renderer holds a retained snapshot gets
  // that state the studio's way: curate the item before it is withdrawn.
  const keep = [...remotes.values()].filter((it) => it.state === "withdrawn-retained");
  if (keep.length) {
    const h = await s.api("POST", "/hoppers", { name: "Retained for the reader suite" });
    const got = await importedIds();
    for (const it of keep) {
      const e = got.get(`${it.origin}${it.id}`);
      const r = await s.api("PUT", `/hoppers/${h.json.id}/items/${e.subscriptionId}/${it.id}`);
      if (r.status >= 300) log(`could not curate ${it.id} (${r.status}): its retention case will fail`);
    }
  }
  remote.state.phase = "final";
  for (const id of subs) await s.api("POST", `/subscriptions/${id}/resync`, {});
  await waitFor(async () => { const got = await importedIds(); return [...remotes.values()].filter((it) => it.history).every((it) => got.get(`${it.origin}${it.id}`)?.withdrawn); }, "remote withdrawals");
}
log(`${remotes.size} remote item(s) imported from ${remote.origins.length} origin(s)`);
if (process.env.READER_DEBUG) for (const [k, e] of await importedIds()) log(`imported ${k}: version ${e.version} withdrawn ${e.withdrawn} pinnedVersionRetained ${e.pinnedVersionRetained}`);

// ── Cases ───────────────────────────────────────────────────────────────────
const results = [];
for (const c of cases) {
  try {
    const kind = c.kind;
    let id;
    if (c.self.prior_content_md !== undefined) {
      const made = await create(kind, mapIn(c.self.prior_content_md));
      id = made.id;
      const p = await publish(id);
      if (p.status >= 300) throw new Error(`publishing the prior version: ${p.status} ${errText(p)}`);
      idMap.set(c.self.id, id);
      for (const it of c.items.filter((x) => x.needs_self)) {
        const dep = await create(it.kind, mapIn(it.content_md));
        idMap.set(it.id, dep.id);
        const dp = await publish(dep.id);
        if (dp.status >= 300) throw new Error(`publishing ${it.id}: ${dp.status} ${errText(dp)}`);
      }
      await edit(id, mapIn(c.content_md));
    } else {
      id = (await create(kind, mapIn(c.content_md))).id;
      idMap.set(c.self.id, id);
    }
    // Generate every scope that carries output, in order, with that output.
    if (c.notation === "reference-tk") {
      // The scope list comes from the preview operation, given the working
      // copy's markdown (given only an itemId, 0.49.12 previews nothing).
      const pv = await s.api("POST", "/preview", { itemId: id, kind, contentMd: (await s.api("GET", `/items/${id}`)).json.contentMd });
      for (const scope of pv.json.scopes || []) {
        if (scope.output === null || scope.imported) continue;
        remote.state.gen.push(scope.output);
        const g = await s.mutate("POST", `/items/${id}/generate`, id, { scope: scope.index });
        if (g.status >= 300) { remote.state.gen.length = 0; throw new Error(`generate scope ${scope.index}: ${g.status} ${errText(g)}`); }
      }
      // The studio tidies model text as it installs it (0.49.12 folds
      // paragraph breaks and drops bracket forms). Put the fixture's output
      // back, as an author editing generated text would: provenance is kept
      // per scope, so the spans stay disclosed.
      if ((pv.json.scopes || []).some((x) => x.output !== null && !x.imported)) await edit(id, mapIn(c.content_md));
    }
    const p = await publish(id);
    if (p.status >= 300) { results.push(mapOut({ id: c.id, error: `HTTP ${p.status}: ${errText(p)}` })); continue; }
    const d = await s.get(`items/${id}.json`);
    const doc = JSON.parse(d.text);
    results.push(mapOut({ id: c.id, content_html: doc.content_html, transclusions: doc.transclusions, links: doc.links ?? (doc.kind ? [] : undefined), generated: doc.generated ?? [], warning: p.json.warning }));
  } catch (e) {
    results.push({ id: c.id, error: `adapter: ${e.message}`, adapter_error: true });
  } finally {
    idMap.delete(c.self.id);
    for (const it of c.items) if (it.needs_self) idMap.delete(it.id);
  }
}
await s.dispose();
process.stdout.write(JSON.stringify({ renderer: { name: "blygger-studio", version: s.version }, results }) + "\n");
