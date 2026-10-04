// The blygger-studio sample scenario: drive a booted studio through its own
// owner API to produce a full sample blyg (every document kind the 0.3
// surface has), then copy its public surface into a sample directory.
// Used by adapters/blygger-studio.mjs.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { STUDIO_ORIGIN } from "./studio-boot.mjs";
import { REMOTE, RA, RB, RC, outbound } from "./fake-remote.mjs";

/** Build the scenario in studio `s` and write its public surface to `SAMPLES`. Returns the scenario ids. */
export async function buildStudioSamples(s, SAMPLES) {
  const log = [];
  const note = (label, r) => { log.push({ label, status: r.status, body: typeof r.json === "object" ? r.json : String(r.json).slice(0, 300) }); return r; };
  const ok = (r, label) => { note(label, r); if (r.status >= 300) throw new Error(`${label}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

  ok(await s.api("PATCH", "/settings", { site_url: STUDIO_ORIGIN, site_title: "Studio Under Test", author_name: "Tester", ai_model: "fake-model-1" }), "settings");
  const sub = ok(await s.api("POST", "/subscriptions", { url: REMOTE, confirm: true }), "subscribe");

  const create = async (label, body) => ok(await s.api("POST", "/items", body), `create ${label}`).id;
  const publish = async (label, id, body = {}) => ok(await s.api("POST", `/items/${id}/publish`, body), `publish ${label}`);
  const edit = async (label, id, body) => ok(await s.api("PATCH", `/items/${id}`, body), `edit ${label}`);
  const pin = async (label, id, v) => ok(await s.api("PUT", `/items/${id}/versions/${v}/pin`), `pin ${label} v${v}`);
  const withdraw = async (label, id) => ok(await s.api("POST", `/items/${id}/withdraw`, { note: "taken back" }), `withdraw ${label}`);
  const scenario = {};

  // 1. local fragment used as a quote target and a TK source
  scenario.local = await create("local", { content_md: "Local source fragment about gardens and paths." });
  await publish("local", scenario.local);

  // 2. media: publish with an image, then remove it and republish (known finding 3)
  scenario.media = await create("media", { content_md: "Image post (draft)" });
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));
  const fd = new FormData();
  fd.append("file", new File([png], "pixel.png", { type: "image/png" }));
  fd.append("item_id", scenario.media);
  fd.append("alt", "a single pixel");
  const up = ok(await s.api("POST", "/media", fd), "upload media");
  await edit("media", scenario.media, { content_md: `Image post\n\n![a single pixel](${up.url})` });
  await publish("media v1", scenario.media);
  await edit("media", scenario.media, { content_md: "Image post — the image has been deleted from the text." });
  await publish("media v2", scenario.media, { note: "removed the image" });

  // 3. versions and a pin
  scenario.pins = await create("pins", { content_md: "First draft of a claim." });
  await publish("pins v1", scenario.pins);
  await edit("pins", scenario.pins, { content_md: "First draft of a claim, typo fixed." });
  await publish("pins v2", scenario.pins, { note: "typo" });
  await edit("pins", scenario.pins, { content_md: "A sharpened claim." });
  await publish("pins v3", scenario.pins, { note: "Sharpened the claim.", note_generated: true });
  await pin("pins", scenario.pins, 2);

  // 4. a thread with every reference kind: local whole, remote whole, remote partial, links, code
  scenario.thread = await create("thread", { kind: "thread", content_md: `Intro to the thread.\n\n![[${scenario.local}]]\n\n![[${RB}]]\n\n![[${RA}]]\n> Stigmergy is what a protocol looks like from inside\n\nSee also [[${RC}]] and [[${scenario.local}]].\n\n\`\`\`\n![[${RA}]]\n\`\`\`` });
  await publish("thread", scenario.thread);
  await pin("thread", scenario.thread, 1);

  // 5. stubs: whole (prefilled), and with a selection (partial prefill)
  scenario.stub = await create("stub", { mode: "response", source: { subscription_id: sub.id, remote_id: RA } });
  await publish("stub", scenario.stub);
  scenario.stubPartial = await create("stub-partial", { mode: "response", source: { subscription_id: sub.id, remote_id: RA }, selection: "Stigmergy is what a protocol looks like from inside" });
  await publish("stub-partial", scenario.stubPartial);
  scenario.stubUrl = await create("stub-url", { kind: "thread", content_md: "A response to a plain web page: [the post](https://plain.example/post)." });
  note("stub-url set", await s.api("PATCH", `/items/${scenario.stubUrl}`, { stub_of: { url: "https://plain.example/post" } }));
  note("stub-url publish", await s.api("POST", `/items/${scenario.stubUrl}/publish`, {}));

  // 6. forks: of a remote pinned thread (its content carries a partial directive and a link), of a remote fragment, of our own pinned thread
  scenario.forkRemoteThread = await create("fork remote thread", { mode: "fork", source: { origin: REMOTE, id: RC, version: 1 } });
  note("fork remote thread publish", await s.api("POST", `/items/${scenario.forkRemoteThread}/publish`, {}));
  scenario.forkRemoteFragment = await create("fork remote fragment", { mode: "fork", source: { origin: REMOTE, id: RA, version: 1 } });
  await publish("fork remote fragment", scenario.forkRemoteFragment);
  scenario.forkOwn = await create("fork own", { mode: "fork", source: { origin: STUDIO_ORIGIN, id: scenario.thread, version: 1 } });
  await publish("fork own", scenario.forkOwn);
  await pin("fork own", scenario.forkOwn, 1);

  // 7. generation: a TK scope with a source (fake provider), and an impyrt span
  scenario.generated = await create("generated", { kind: "thread", content_md: `[TK]Summarise ![[${scenario.local}]][/TK]\n\nAfterword by the author.` });
  ok(await s.api("POST", `/items/${scenario.generated}/generate`, { scope: 0 }), "generate");
  await publish("generated", scenario.generated);
  await pin("generated", scenario.generated, 1);
  scenario.impyrt = await create("impyrt", { content_md: "Pasted from elsewhere: [TK]impyrt other-model=Text another tool produced.[/TK]" });
  await publish("impyrt", scenario.impyrt);

  // 8. withdrawals: a pinned fragment, a stub (endcap must omit stub_of), a fork (endcap keeps forked_from)
  scenario.withdrawn = await create("withdrawn", { content_md: "Soon to be withdrawn." });
  await publish("withdrawn", scenario.withdrawn);
  await pin("withdrawn", scenario.withdrawn, 1);
  await withdraw("withdrawn", scenario.withdrawn);
  await withdraw("stub", scenario.stub);
  await withdraw("fork remote fragment", scenario.forkRemoteFragment);

  // ---- collect the public surface ----
  rmSync(SAMPLES, { recursive: true, force: true });
  mkdirSync(join(SAMPLES, "items"), { recursive: true });
  const put = (p, text) => { mkdirSync(dirname(join(SAMPLES, p)), { recursive: true }); writeFileSync(join(SAMPLES, p), text); };
  for (const p of ["blyg.json", "feed.xml", "items/index.json"]) put(p, (await s.get(p)).text);
  const index = JSON.parse((await s.get("items/index.json")).text);
  for (const e of index.items) {
    const doc = (await s.get(`items/${e.id}.json`)).text;
    put(`items/${e.id}.json`, doc);
    for (const c of JSON.parse(doc).changelog || []) if (c.pinned) {
      const r = await s.get(`items/${e.id}/v${c.version}.json`);
      if (r.status === 200) put(`items/${e.id}/v${c.version}.json`, r.text);
    }
  }
  const labels = Object.fromEntries(Object.entries(scenario).map(([k, v]) => [v, k]));
  put("scenario.json", JSON.stringify({ title: `blygger-studio ${s.version} (in-process harness)`, studio_version: s.version, origin: STUDIO_ORIGIN, remote: REMOTE, scenario, labels, log, outbound: outbound.log.filter((l) => !l.includes("anthropic")).slice(0, 80) }, null, 2));
  console.log(`collected ${index.items.length} items`);
  return scenario;
}
