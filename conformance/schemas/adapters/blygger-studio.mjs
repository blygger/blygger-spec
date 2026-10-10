// The built-in implementation adapter: blygger-studio, the reference client.
// See ADAPTERS.md for the interface.
//
// The studio is booted in process (harness/studio-boot.mjs): its Worker is
// bundled from its own source with its own esbuild and run under its own
// Miniflare with D1 + R2, subscribed to the fake remote blyg. Nothing in the
// studio checkout is modified.
//
// STUDIO_DIR overrides the checkout; the default is ../blygger-studio next to
// this repository.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootStudio } from "../harness/studio-boot.mjs";
import { buildStudioSamples } from "../harness/studio-scenario.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studioDir = () => resolve(process.env.STUDIO_DIR || join(here, "..", "..", "..", "..", "blygger-studio"));

let studio = null; // booted lazily, shared by samples() and grammar()
let localId = null;
const boot = async () => {
  if (!studio) {
    studio = await bootStudio(studioDir());
    console.log(`  studio ${studio.version} booted from ${studioDir()}`);
  }
  return studio;
};

export default {
  id: "studio",
  name: "blygger-studio",

  async version() {
    return JSON.parse(readFileSync(join(studioDir(), "package.json"), "utf8")).version;
  },

  async samples(dir) {
    const s = await boot();
    const scenario = await buildStudioSamples(s, dir);
    localId = scenario.local;
  },

  async grammar(cases, ctx) {
    const s = await boot();
    if (!localId) {
      const r = await s.api("POST", "/items", { content_md: ctx.local.content_md });
      localId = r.json.id;
      await s.api("POST", `/items/${localId}/publish`, {});
    }
    const results = [];
    for (const c0 of cases) {
      const c = ctx.subst(c0, localId);
      const created = await s.api("POST", "/items", { kind: "thread", content_md: c.content_md });
      const id = created.json.id;
      // Generate every TK scope so provenance (and hence generated[].sources)
      // exists, unless the case's TK output is the author's own.
      if (c.generate !== false) for (let i = 0; i < 4; i++) { const g = await s.api("POST", `/items/${id}/generate`, { scope: i }); if (g.status >= 300) break; }
      const p = await s.api("POST", `/items/${id}/publish`, {});
      if (p.status >= 300) { results.push({ case: c0.id, error: true, errorText: JSON.stringify(p.json).slice(0, 200) }); continue; }
      const doc = JSON.parse((await s.get(`items/${id}.json`)).text);
      results.push({
        case: c0.id, error: false, html: doc.content_html,
        transclusions: (doc.transclusions || []).map((t) => ({ id: t.id, partial: !!t.selector, exact: t.selector?.exact })),
        tk_sources: (doc.generated || []).map((g) => g.sources.map((x) => x.id)),
      });
    }
    return { localId, results };
  },

  async dispose() {
    if (studio) await studio.dispose();
    studio = null;
    localId = null;
  },
};
