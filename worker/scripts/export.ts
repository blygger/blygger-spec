// Static export (v0.1-plan §3.5; v0.2 additions per v0.2-plan.md §5 task 13):
// fetch every public route from a running blyg instance and write the
// byte-identical file tree — proves the page is servable from a dumb file
// host (invariant 4).
//
//   npm run export -- --out DIR --base https://example.com/blyg/ [--hoppers slug1,slug2] [--allow-local]
//
// --hoppers is explicit because the protocol has no public "list of public
// hoppers" surface (§4.2 only adds blogroll.opml and /h/{slug}/, not a third
// discovery endpoint) — the operator names which of their own public
// hoppers to mirror, same as they already name --base themselves.
//
// --allow-local permits an export from an instance that declares a loopback
// origin; see the preflight below.
//
// Runs under `node --experimental-strip-types` (Node 22+); no dependencies.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkExportOrigin, normalizeBase, stripWebmentionLink } from "./export-lib.ts";

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) {
    console.error(
      `usage: npm run export -- --out DIR --base https://host/blyg/ [--hoppers slug1,slug2] [--allow-local]`,
    );
    process.exit(1);
  }
  return process.argv[i + 1];
}

function optionalArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i + 1 >= process.argv.length ? undefined : process.argv[i + 1];
}

const out = arg("out");
const base = normalizeBase(arg("base"));
const allowLocal = process.argv.includes("--allow-local");
const hopperSlugs = (optionalArg("hoppers") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function write(file: string, bytes: Uint8Array): Promise<Uint8Array> {
  const dest = path.join(out, file);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  console.log(`${String(bytes.length).padStart(8)}  ${file}`);
  return bytes;
}

async function save(route: string, file: string): Promise<Uint8Array> {
  const url = base + route;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // The second half of the one deliberate served-vs-exported difference (see
  // the manifest note below): pages advertise the endpoint in W3C's own form
  // too, and that is the form a stranger's sender actually discovers.
  if (file.endsWith(".html")) {
    return write(file, new TextEncoder().encode(stripWebmentionLink(new TextDecoder().decode(bytes))));
  }
  return write(file, bytes);
}

/** Like save(), but a 404 is a legitimate "nothing to export here" rather than a failure (blogroll.opml when empty; §2.2). */
async function trySave(route: string, file: string): Promise<Uint8Array | null> {
  const url = base + route;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return write(file, new Uint8Array(await res.arrayBuffer()));
}

// Preflight, before a single file is written: the tree we are about to save
// bakes absolute URLs that this instance derived from its *own* origin, not
// from --base. Check what it thinks that origin is. (checkExportOrigin carries
// the reasoning for refuse-vs-warn.)
const manifestBytes = await (async () => {
  const url = base + "blyg.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return new Uint8Array(await res.arrayBuffer());
})();
const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as { site?: string; webmention?: string };
const originCheck = checkExportOrigin(base, manifest.site, allowLocal);
if (originCheck.refuse) {
  console.error(`export refused: ${originCheck.refuse}`);
  process.exit(1);
}
if (originCheck.warn) console.warn(`warning: ${originCheck.warn}\n`);

// Fixed surfaces.
await save("", "index.html");
await save("style.css", "style.css");
await save("feed.xml", "feed.xml");
// The one deliberate difference between the served tree and the exported one
// (v0.3-plan §2.3.1/§6): a static export has no endpoint behind it, so it must
// not advertise one. Everything else is written back byte-for-byte.
const { webmention: _omitted, ...staticManifest } = manifest as Record<string, unknown>;
await write("blyg.json", new TextEncoder().encode(JSON.stringify(staticManifest)));
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
  const item = JSON.parse(new TextDecoder().decode(itemBytes)) as {
    media: { url: string }[];
    changelog: { version: number; pinned?: boolean }[];
    transclusions?: unknown[];
  };
  // A thread item (live or withdrawn-but-authored-as-thread) carries a
  // transclusions field (§2.9); fragments never do.
  const isThread = "transclusions" in item;
  await save(`${isThread ? "t" : "f"}/${id}/`, `${isThread ? "t" : "f"}/${id}/index.html`);
  for (const m of item.media) mediaUrls.add(m.url);
  // §2.8 pinned version files, discovered from the changelog — each pin is
  // two artifacts since session 18: the JSON promise and its HTML page.
  for (const v of item.changelog) {
    if (v.pinned) {
      await save(`items/${id}/v${v.version}.json`, `items/${id}/v${v.version}.json`);
      await save(`${isThread ? "t" : "f"}/${id}/v${v.version}/`, `${isThread ? "t" : "f"}/${id}/v${v.version}/index.html`);
      pinnedCount++;
    }
  }
}

// Media referenced by any item.
for (const url of mediaUrls) await save(url, url);

// v0.2: blogroll (§2.2) — optional, 404s when no subscription is public.
const blogroll = await trySave("blogroll.opml", "blogroll.opml");

// v0.2: public hopper pages (§4.2 task 11), operator-named via --hoppers.
for (const slug of hopperSlugs) {
  await save(`h/${slug}/`, `h/${slug}/index.html`);
}

console.log(
  `\nexported ${6 + index.items.length * 2 + pinnedCount * 2 + mediaUrls.size + (blogroll ? 1 : 0) + hopperSlugs.length} files to ${out}`,
);
