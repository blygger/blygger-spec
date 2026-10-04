// Schema explorer + coverage: the field tree of each document type, and
// which implementation emits / understands each field.
import { loadSchema } from "./validate.mjs";

const D = "blygger-desktop/crates/blyg-core/src";
/**
 * Static reading of blygger-desktop 0.7.0's serde types for the public
 * surface. reads: the type has the field; keeps: it survives into the stored
 * ReadingItem/Lineage (what a round trip can re-emit). Verified dynamically by
 * harness/desktop-run.mjs for item documents.
 */
export const DESKTOP_STATIC = {
  item: {
    blyg: [false, false, `${D}/api/public.rs:40 ItemDoc has no blyg`],
    id: [true, true, "ItemDoc.id → ReadingItem.remote_id"],
    kind: [true, true, "ItemDoc.kind; withdrawn → state 'tombstone'"],
    origin: [false, false, "ItemDoc has no origin; the caller's origin is used instead (§15.4 identity is never checked against the document)"],
    page: [true, true, "ItemDoc.page"],
    author: [true, false, `${D}/model.rs:205 Author{name,url} — other members dropped (§5.5 C-5.5-05)`],
    "author.name": [true, true, "Author.name"],
    "author.url": [true, true, "Author.url"],
    created: [true, true, ""], updated: [true, true, ""], version: [true, true, ""],
    content_md: [true, true, ""], content_html: [true, true, ""],
    content_hash: [false, false, "ItemDoc ignores it (PinDoc checks it)"],
    media: [true, false, "ItemDoc.media read for display (versions_at), not stored on ReadingItem"],
    "media[].url": [true, false, ""], "media[].mime": [true, false, ""], "media[].alt": [true, false, ""],
    changelog: [true, true, "ChangelogEntry → RemoteVersion"],
    "changelog[].version": [true, true, ""], "changelog[].at": [true, true, ""], "changelog[].note": [true, true, ""], "changelog[].pinned": [true, true, ""],
    "changelog[].generated": [false, false, "ChangelogEntry has no generated (§16.6c, #40)"],
    transclusions: [true, true, `${D}/model.rs:305 TransclusionRef`],
    "transclusions[].origin": [true, true, ""], "transclusions[].id": [true, true, ""], "transclusions[].version": [true, true, "Option<u32>"],
    "transclusions[].cited": [true, true, "Cited"],
    "transclusions[].selector": [false, false, "TransclusionRef has no selector — partial quotes become whole on round trip (#49)"],
    stub_of: [true, true, `${D}/model.rs:282 StubOf{origin,id,version,url}`],
    "stub_of.cited": [false, false, "StubOf has no cited (#30, #55)"],
    forked_from: [true, true, `${D}/model.rs:72 RemoteRef{origin,id,version}`],
    "forked_from.cited": [false, false, "RemoteRef has no cited (#30)"],
    generated: [false, false, "ItemDoc has no generated (§5.7) — imported generation provenance is invisible"],
  },
  pinned: {
    id: [true, true, `${D}/api/public.rs:226 PinDoc`], version: [true, true, ""], at: [true, true, ""], note: [true, true, ""], pinned: [true, true, ""],
    author: [true, false, "Author{name,url}"], content_md: [true, true, ""], content_html: [true, true, ""], content_hash: [true, true, "checked: hash_mismatch"],
    kind: [false, false, "PinDoc has no kind"], origin: [false, false, ""], blyg: [false, false, ""],
    transclusions: [false, false, "PinDoc drops a pin's citations (§8 rule 5)"], generated: [false, false, ""], stub_of: [false, false, ""], forked_from: [false, false, ""],
  },
  manifest: {
    blyg: [true, false, `${D}/profile.rs is_manifest: presence of "blyg" is the §12.1 test`],
    title: [true, true, `${D}/profile.rs:222 Manifest`], author: [true, true, "name, bio, avatar, links"], feed: [true, true, ""], items: [true, true, ""], blogroll: [true, true, ""],
    level: [false, false, ""], generator: [false, false, ""], generator_url: [false, false, ""], site: [false, false, "correct: site is display-advisory (§12.2)"], webmention: [false, false, ""], updated: [false, false, ""],
  },
  index: {
    updated: [false, false, ""], items: [true, true, `${D}/profile.rs:303 IndexEntry`],
    "items[].id": [true, true, ""], "items[].kind": [true, true, ""], "items[].created": [true, true, ""], "items[].updated": [true, true, ""], "items[].version": [true, true, ""],
  },
};

/** Flatten a schema's properties into explorer rows. */
export function schemaTree() {
  const defs = loadSchema("defs.schema.json").$defs;
  const adv = loadSchema("advisory.schema.json").$defs;
  const resolve = (s) => {
    if (!s) return s;
    if (s.$ref) { const name = s.$ref.split("/").pop(); return { ...defs[name], ...s, $ref: undefined, _def: name }; }
    return s;
  };
  const advReq = { item: adv.item.required, pinned: adv.pinned.required, manifest: adv.manifest.required, index: [] };
  const out = {};
  for (const [type, file] of [["item", "item"], ["pinned", "pinned"], ["manifest", "manifest"], ["index", "index"]]) {
    const sch = loadSchema(`${file}.schema.json`);
    const rows = [];
    const walk = (s, path, required, depth) => {
      s = resolve(s);
      if (!s) return;
      let props = s.properties;
      // pull properties through allOf/oneOf of references
      const merge = (x) => { x = resolve(x); if (x?.properties) props = { ...(x.properties || {}), ...(props || {}) }; for (const y of x?.allOf || []) merge(y); };
      for (const y of s.allOf || []) merge(y);
      if (s.oneOf) for (const y of s.oneOf) merge(y);
      if (s.type === "array" && s.items) return walk(s.items, path + "[]", required, depth);
      if (!props) return;
      const req = new Set([...(s.required || []), ...((s.allOf || []).flatMap((x) => resolve(x)?.required || []))]);
      for (const [k, v0] of Object.entries(props)) {
        if (v0 === true) continue;
        const v = resolve(v0);
        const p = path ? `${path}.${k}` : k;
        const status = req.has(k) ? "required" : depth === 0 && advReq[type]?.includes(k) ? "advisory" : "optional";
        const t = v.type || (v.const !== undefined ? `const ${JSON.stringify(v.const)}` : v.enum ? v.enum.join("|") : v.oneOf ? "oneOf" : v._def || "object");
        const desc = v0.description || v.description || "";
        rows.push({ path: p, depth, type: Array.isArray(t) ? t.join("|") : t, status, desc, spec: [...new Set((desc.match(/§[\d.]+[a-z]?/g) || []))], decisions: [...new Set(desc.match(/#\d+/g) || [])] });
        if (depth < 3) walk(v, p, req, depth + 1);
      }
    };
    walk(sch, "", null, 0);
    out[type] = rows;
  }
  return out;
}

/** Leaf+interior paths present in a set of documents (arrays as []). */
export function observedPaths(docs) {
  const seen = new Set();
  const visit = (v, p) => {
    if (p) seen.add(p);
    if (Array.isArray(v)) v.forEach((x) => visit(x, p + "[]"));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visit(x, p ? `${p}.${k}` : k);
  };
  for (const d of docs) visit(d, "");
  // "transclusions[]" etc. → also mark "transclusions[].x" as "transclusions.x"-free form used by the tree
  return new Set([...seen].map((p) => p.replace(/\[\]\./g, "[].")));
}
