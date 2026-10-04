// Schema explorer + coverage: the field tree of each document type, and the
// paths observed in a set of documents. Per-implementation "reads / keeps"
// columns come from adapters' staticFields() (see ADAPTERS.md).
import { loadSchema } from "./validate.mjs";

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
