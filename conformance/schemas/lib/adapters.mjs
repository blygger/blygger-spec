// Implementation adapters: loading, validation, and the helpers handed to them.
// The interface is documented in ../ADAPTERS.md.
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const BUILTIN = [join(here, "..", "adapters", "blygger-studio.mjs")];

const expandHome = (p) => (p.startsWith("~/") ? join(process.env.HOME || "", p.slice(2)) : p);

/**
 * Adapter module paths, in run order: the built-in adapter(s), then IMPLS
 * (colon- or comma-separated paths), then every `--impl <path>` argument.
 */
export function adapterPaths(argv, env = process.env) {
  const extra = [];
  for (const p of (env.IMPLS || "").split(/[,:]/).map((x) => x.trim()).filter(Boolean)) extra.push(p);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--impl" && argv[i + 1]) extra.push(argv[++i]);
    else if (argv[i].startsWith("--impl=")) extra.push(argv[i].slice(7));
  }
  const paths = [...BUILTIN, ...extra.map((p) => resolve(process.cwd(), expandHome(p)))];
  return [...new Set(paths)];
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

/** Import and validate each adapter module. */
export async function loadAdapters(paths) {
  const out = [];
  for (const p of paths) {
    if (!isAbsolute(p) || !existsSync(p)) throw new Error(`adapter not found: ${p}`);
    const mod = await import(pathToFileURL(p).href);
    const a = mod.default ?? mod.adapter;
    if (!a || typeof a !== "object") throw new Error(`${p}: no default export (an adapter object)`);
    if (typeof a.id !== "string" || !ID.test(a.id)) throw new Error(`${p}: id must match ${ID}`);
    if (typeof a.name !== "string" || !a.name) throw new Error(`${p}: name is required`);
    if (typeof a.version !== "function") throw new Error(`${p}: version() is required`);
    if (!["samples", "grammar", "roundtrip", "staticFields"].some((k) => typeof a[k] === "function"))
      throw new Error(`${p}: implements none of samples(), grammar(), roundtrip(), staticFields()`);
    if (out.some((b) => b.id === a.id)) throw new Error(`${p}: duplicate adapter id "${a.id}"`);
    out.push(Object.assign(Object.create(a), { path: p }));
  }
  return out;
}

/** Leaf paths of a JSON value, arrays normalized to `[]` (for round-trip loss accounting). */
export function leaves(v, p = "", out = new Set()) {
  if (Array.isArray(v)) { if (!v.length) out.add(p + "[]"); v.forEach((x) => leaves(x, p + "[]", out)); }
  else if (v && typeof v === "object") { const ks = Object.keys(v); if (!ks.length) out.add(p); for (const k of ks) leaves(v[k], p ? `${p}.${k}` : k, out); }
  else out.add(p);
  return out;
}

/**
 * Aggregate per-document survival into the `dropped` list roundtrip() returns.
 * perDoc: [{ path, input: <parsed input doc>, kept: (inputLeafPath) => boolean }]
 */
export function dropped(perDoc, { ignore = [] } = {}) {
  const loss = {};
  for (const d of perDoc) {
    for (const p of leaves(d.input)) {
      if (ignore.includes(p) || d.kept(p)) continue;
      loss[p] ??= { count: 0, sets: new Set(), example: d.path };
      loss[p].count++;
      loss[p].sets.add(d.path.split("/")[0]);
    }
  }
  return Object.entries(loss).map(([path, v]) => ({ path, count: v.count, sets: [...v.sets], example: v.example })).sort((a, b) => b.count - a.count);
}
