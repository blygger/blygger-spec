// The blygger-studio sample scenario: drive a booted studio through its owner
// REST contract (src/contract/routes.ts; contract 5.0.0 since 0.49.12:
// camelCase members, item mutations conditional on expectedRevision) to
// produce a full sample blyg (every document kind the 0.3/0.4 surface has),
// then copy its public surface into a sample directory.
// Used by adapters/blygger-studio.mjs; the studio is booted by
// conformance/lib/studio-boot.mjs.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { REMOTE, RA, RB, RC, outbound } from "./fake-remote.mjs";

export const STUDIO_ORIGIN = "https://studio.example/";

/** Build the scenario in studio `s` and write its public surface to `SAMPLES`. Returns the scenario ids. */
export async function buildStudioSamples(s, SAMPLES) {
  const log = [];
  const note = (label, r) => { log.push({ label, status: r.status, body: typeof r.json === "object" ? r.json : String(r.json).slice(0, 300) }); return r; };
  const ok = (r, label) => { note(label, r); if (r.status >= 300) throw new Error(`${label}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

  // generate refuses to run until a TK model is chosen; the model must be one the studio knows (models.json); the fake provider answers for any.
  ok(await s.api("PATCH", "/settings", { siteUrl: STUDIO_ORIGIN, siteTitle: "Studio Under Test", authorName: "Tester", aiModel: "claude-sonnet-5-5", aiModelTk: "claude-sonnet-5-5" }), "settings");
  const sub = ok(await s.api("POST", "/subscriptions", { url: REMOTE, confirm: true }), "subscribe");
  const subId = sub.id ?? sub.subscription?.id;
  // The subscription imports in the background (contract 5.0.0); wait for the
  // three remote items before quoting, stubbing or forking them.
  for (let i = 0; i < 100; i++) {
    const r = await s.api("GET", "/reading/imported?limit=100");
    if (r.status < 300 && [RA, RB, RC].every((id) => r.json.items?.some((e) => e.remoteId === id))) break;
    await new Promise((res) => setTimeout(res, 100));
  }

  const create = async (label, body) => ok(await s.api("POST", "/items", body), `create ${label}`).id;
  const publish = async (label, id, body = {}) => ok(await s.mutate("POST", `/items/${id}/publish`, id, body), `publish ${label}`);
  const edit = async (label, id, body) => ok(await s.mutate("PATCH", `/items/${id}`, id, body), `edit ${label}`);
  const pin = async (label, id, v) => ok(await s.mutate("PUT", `/items/${id}/versions/${v}/pin`, id), `pin ${label} v${v}`);
  const withdraw = async (label, id) => ok(await s.mutate("POST", `/items/${id}/withdraw`, id, { note: "taken back" }), `withdraw ${label}`);
  const scenario = {};

  // 1. local fragment used as a quote target and a TK source
  scenario.local = await create("local", { contentMd: "Local source fragment about gardens and paths." });
  await publish("local", scenario.local);

  // 2. media: publish with an image, then remove it and republish (known finding 3)
  scenario.media = await create("media", { contentMd: "Image post (draft)" });
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));
  const fd = new FormData();
  fd.append("file", new File([png], "pixel.png", { type: "image/png" }));
  fd.append("itemId", scenario.media);
  fd.append("alt", "a single pixel");
  fd.append("expectedRevision", String(await s.revision(scenario.media))); // attaching media is a conditional mutation
  const up = ok(await s.api("POST", "/media", fd), "upload media");
  await edit("media", scenario.media, { contentMd: `Image post\n\n![a single pixel](${up.url})` });
  await publish("media v1", scenario.media);
  await edit("media", scenario.media, { contentMd: "Image post — the image has been deleted from the text." });
  await publish("media v2", scenario.media, { note: "removed the image" });

  // 3. versions and a pin
  scenario.pins = await create("pins", { contentMd: "First draft of a claim." });
  await publish("pins v1", scenario.pins);
  await edit("pins", scenario.pins, { contentMd: "First draft of a claim, typo fixed." });
  await publish("pins v2", scenario.pins, { note: "typo" });
  await edit("pins", scenario.pins, { contentMd: "A sharpened claim." });
  await publish("pins v3", scenario.pins, { note: "Sharpened the claim.", noteGenerated: true });
  await pin("pins", scenario.pins, 2);

  // 4. a thread with every reference kind: local whole, remote whole, remote partial, links, code
  scenario.thread = await create("thread", { kind: "thread", contentMd: `Intro to the thread.\n\n![[${scenario.local}]]\n\n![[${RB}]]\n\n![[${RA}]]\n> Stigmergy is what a protocol looks like from inside\n\nSee also [[${RC}]] and [[${scenario.local}]].\n\n\`\`\`\n![[${RA}]]\n\`\`\`` });
  await publish("thread", scenario.thread);
  await pin("thread", scenario.thread, 1);

  // 5. stubs: whole (prefilled), and with a selection (partial prefill)
  scenario.stub = await create("stub", { mode: "response", source: { subscriptionId: subId, remoteId: RA } });
  await publish("stub", scenario.stub);
  scenario.stubPartial = await create("stub-partial", { mode: "response", source: { subscriptionId: subId, remoteId: RA }, selection: "Stigmergy is what a protocol looks like from inside" });
  await publish("stub-partial", scenario.stubPartial);
  scenario.stubUrl = await create("stub-url", { kind: "thread", contentMd: "A response to a plain web page: [the post](https://plain.example/post)." });
  note("stub-url set", await s.mutate("PATCH", `/items/${scenario.stubUrl}`, scenario.stubUrl, { stubOf: { url: "https://plain.example/post" } }));
  note("stub-url publish", await s.mutate("POST", `/items/${scenario.stubUrl}/publish`, scenario.stubUrl));

  // 6. forks: of a remote pinned thread (its content carries a partial directive and a link), of a remote fragment, of our own pinned thread
  scenario.forkRemoteThread = await create("fork remote thread", { mode: "fork", source: { origin: REMOTE, id: RC, version: 1 } });
  note("fork remote thread publish", await s.mutate("POST", `/items/${scenario.forkRemoteThread}/publish`, scenario.forkRemoteThread));
  scenario.forkRemoteFragment = await create("fork remote fragment", { mode: "fork", source: { origin: REMOTE, id: RA, version: 1 } });
  await publish("fork remote fragment", scenario.forkRemoteFragment);
  scenario.forkOwn = await create("fork own", { mode: "fork", source: { origin: STUDIO_ORIGIN, id: scenario.thread, version: 1 } });
  await publish("fork own", scenario.forkOwn);
  await pin("fork own", scenario.forkOwn, 1);

  // 7. generation: a TK scope with a source (fake provider), and an impyrt span
  scenario.generated = await create("generated", { kind: "thread", contentMd: `[TK]Summarise ![[${scenario.local}]][/TK]\n\nAfterword by the author.` });
  ok(await s.mutate("POST", `/items/${scenario.generated}/generate`, scenario.generated, { scope: 0 }), "generate");
  await publish("generated", scenario.generated);
  await pin("generated", scenario.generated, 1);
  scenario.impyrt = await create("impyrt", { contentMd: "Pasted from elsewhere: [TK]impyrt other-model=Text another tool produced.[/TK]" });
  await publish("impyrt", scenario.impyrt);

  // 8. withdrawals: a pinned fragment, a stub (endcap must omit stub_of), a fork (endcap keeps forked_from)
  scenario.withdrawn = await create("withdrawn", { contentMd: "Soon to be withdrawn." });
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
