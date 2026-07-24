// Static export (v0.1-plan §3.5): fetch every public route from a running
// ygg instance and write the byte-identical file tree — proves the page is
// servable from a dumb file host (invariant 4).
//
//   npm run export -- --out DIR --base https://example.com/ygg/
//
// Runs under `node --experimental-strip-types` (Node 22+); no dependencies.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) {
    console.error(`usage: npm run export -- --out DIR --base https://host/ygg/`);
    process.exit(1);
  }
  return process.argv[i + 1];
}

const out = arg("out");
const base = arg("base").endsWith("/") ? arg("base") : arg("base") + "/";

async function save(route: string, file: string): Promise<Uint8Array> {
  const url = base + route;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const dest = path.join(out, file);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  console.log(`${String(bytes.length).padStart(8)}  ${file}`);
  return bytes;
}

// Fixed surfaces.
await save("", "index.html");
await save("style.css", "style.css");
await save("feed.xml", "feed.xml");
await save("ygg.json", "ygg.json");
await save("archive/", "archive/index.html");
const indexBytes = await save("items/index.json", "items/index.json");

// Every item file + permalink, discovered from the archive index.
const index = JSON.parse(new TextDecoder().decode(indexBytes)) as {
  items: { id: string }[];
};
const mediaUrls = new Set<string>();
let pinnedCount = 0;
for (const { id } of index.items) {
  const itemBytes = await save(`items/${id}.json`, `items/${id}.json`);
  await save(`f/${id}/`, `f/${id}/index.html`);
  const item = JSON.parse(new TextDecoder().decode(itemBytes)) as {
    media: { url: string }[];
    changelog: { version: number; pinned?: boolean }[];
  };
  for (const m of item.media) mediaUrls.add(m.url);
  // §2.8 pinned version files, discovered from the changelog.
  for (const v of item.changelog) {
    if (v.pinned) {
      await save(`items/${id}/v${v.version}.json`, `items/${id}/v${v.version}.json`);
      pinnedCount++;
    }
  }
}

// Media referenced by any item.
for (const url of mediaUrls) await save(url, url);

console.log(`\nexported ${6 + index.items.length * 2 + pinnedCount + mediaUrls.size} files to ${out}`);
