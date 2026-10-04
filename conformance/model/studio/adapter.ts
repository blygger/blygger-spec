// The real blygger-studio as node S. Studio source is imported through the
// "@studio" alias (vitest.config.mts → $STUDIO_DIR/src); nothing in that repo is
// modified. Publishing, forking and importing go through the studio's own
// functions against a miniflare D1; pinning and withdrawal go through its owner
// API (so the API's preconditions apply); the public surface is read through
// SELF.fetch, exactly as a subscriber would.
import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import worker from "@studio/index.ts";
import { CLIENT } from "@studio/client.ts";
import { createDraft, createFork, getItem, publish, saveWorkingCopy } from "@studio/model.ts";
import { resolveForkSource } from "@studio/fork.ts";
import { flattenFork } from "@studio/fork-flatten.ts";
import { blygItemUrl } from "@studio/importer/util.ts";
import { pollSubscription, reconcileIndex } from "@studio/importer/poll.ts";
import { addHopperItem, createHopper, createSubscription, getSubscription } from "@studio/importer/store.ts";
import type { FetchLike } from "@studio/importer/http.ts";
import type { ModelFetch } from "../src/model/network.ts";
import type { BlygRef, Kind, Served, TRef } from "../src/model/publisher.ts";
import { A_ORIGIN, B_ORIGIN, L_ORIGIN, type ObsS, type PublishResult, S_ORIGIN, type StudioAdapter } from "../src/model/world.ts";

const db = () => (env as any).DB as D1Database;
const BASE = "https://example.com";

/**
 * Requests go straight to the studio's exported fetch handler with a fresh
 * ExecutionContext, rather than through SELF: after ~1,700 SELF.fetch calls in
 * one test the pool's SELF proxy fails with "Maximum call stack size exceeded"
 * (reproduced with a loop of plain GETs; a harness artefact, not studio code).
 */
async function call(input: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await (worker as any).fetch(new Request(input, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

function toFetchLike(f: ModelFetch): FetchLike {
  return async (url: string) => {
    const r = await f(url);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, url, headers: new Headers(), text: async () => r.body } as any;
  };
}

function stripRef(t: any): TRef {
  return { id: t.id, version: t.version, ...(t.origin ? { origin: t.origin } : {}), ...(t.selector ? { selector: { exact: t.selector.exact } } : {}) };
}

/** Copy of api.ts's (unexported) quotedLink, 0.20.0: ours, an import's own `page`, else its item document. */
async function quotedLink(quoteOrigin: string, id: string): Promise<string> {
  if (quoteOrigin === S_ORIGIN) {
    const own = await db().prepare("SELECT kind FROM items WHERE id = ?").bind(id).first<{ kind: string }>();
    if (own) return blygItemUrl(S_ORIGIN, own.kind === "thread" ? "thread" : "fragment", id, null);
  }
  const row = await db()
    .prepare("SELECT ii.kind AS kind, ii.page AS page FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id WHERE ii.remote_id = ? AND s.origin = ?")
    .bind(id, quoteOrigin)
    .first<{ kind: string; page: string | null }>();
  return row ? blygItemUrl(quoteOrigin, row.kind, id, row.page) : `${quoteOrigin}items/${id}.json`;
}

export class Studio implements StudioAdapter {
  version = CLIENT.version;
  /** Whether the last fork's flatten took the byte-exact path (false = whole-HTML fallback). */
  lastFlattenExact?: boolean;
  private cookie?: string;
  private subs = new Map<string, string>();
  private hopper?: string;

  private async login() {
    if (this.cookie) return this.cookie;
    const res = await call(`${BASE}/blyg/studio/login`, { method: "POST", body: new URLSearchParams({ password: "test-password" }), redirect: "manual" });
    this.cookie = res.headers.get("set-cookie")!.split(";")[0];
    return this.cookie;
  }

  async reset() {
    const tables = await db().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%'").all<{ name: string }>();
    for (const t of tables.results) await db().prepare(`DELETE FROM "${t.name}"`).run();
    this.subs.clear();
    for (const [origin, kind] of [[A_ORIGIN, "blyg"], [B_ORIGIN, "blyg"], [L_ORIGIN, "rss"]] as const) {
      const s = await createSubscription(db(), { kind, origin, feedUrl: `${origin}feed.xml`, title: origin });
      this.subs.set(origin, s.id);
    }
    // §13.4 retention is MAY; the studio exercises it only for items held in a hopper,
    // so every blyg import goes into one (see README).
    this.hopper = (await createHopper(db(), "retain-all", null)).id;
  }

  async publish(id: string, kind: Kind, md: string, stubTarget?: BlygRef): Promise<PublishResult> {
    let item = await getItem(db(), id);
    if (!item) {
      const d = await createDraft(db(), md, kind, kind === "thread" && stubTarget ? stubTarget : null);
      await db().prepare("UPDATE items SET id = ? WHERE id = ?").bind(id, d.id).run();
    } else {
      await saveWorkingCopy(db(), id, md);
    }
    item = (await getItem(db(), id))!;
    try {
      return { ok: true, version: await publish(db(), item, null, S_ORIGIN) };
    } catch (e: any) {
      return { ok: false, errors: (e?.errors ?? [{ reason: String(e?.message ?? e) }]).map((x: any) => ({ id: String(x.directive ?? ""), reason: String(x.reason ?? x.message ?? x) })) };
    }
  }

  async withdraw(id: string) {
    const res = await call(`${BASE}/api/items/${id}/withdraw`, { method: "POST", headers: { cookie: await this.login(), "content-type": "application/json" }, body: "{}" });
    return res.status === 200 ? ((await res.json()) as any).version : null;
  }

  async pin(id: string, n: number) {
    const res = await call(`${BASE}/api/items/${id}/versions/${n}/pin`, { method: "PUT", headers: { cookie: await this.login() } });
    return res.status === 200;
  }

  private async retainAll() {
    const rows = await db().prepare("SELECT ii.subscription_id, ii.remote_id FROM imported_items ii WHERE ii.l0 = 0").all<{ subscription_id: string; remote_id: string }>();
    for (const r of rows.results) await addHopperItem(db(), this.hopper!, r.subscription_id, r.remote_id);
  }

  async poll(origin: string, fetch: ModelFetch) {
    const sub = (await getSubscription(db(), this.subs.get(origin)!))!;
    await pollSubscription(db(), sub, toFetchLike(fetch));
    await this.retainAll();
  }

  async reconcile(origin: string, fetch: ModelFetch) {
    const sub = (await getSubscription(db(), this.subs.get(origin)!))!;
    await reconcileIndex(db(), sub, toFetchLike(fetch));
    await this.retainAll();
  }

  async fork(ref: BlygRef, newId: string, fetch: ModelFetch) {
    const src = await resolveForkSource(db(), ref, S_ORIGIN, "S", toFetchLike(fetch), new Date().toISOString());
    if (!src.ok) return { ok: false as const, refused: src.reason };
    // The same two steps as the studio's fork route (api.ts createForkResponse,
    // 0.20.0): resolveForkSource, then #57's flattenFork, then createFork. The
    // route itself fetches with the platform fetch, which cannot reach the model
    // origins; this is the one place the adapter re-composes studio code.
    const flat = await flattenFork(src.source, { origin: ref.origin, link: (o, id) => quotedLink(o, id) });
    const d = await createFork(db(), flat.contentMd, src.source.kind, ref, src.source.cite);
    this.lastFlattenExact = flat.exact;
    await db().prepare("UPDATE items SET id = ? WHERE id = ?").bind(newId, d.id).run();
    const item = (await getItem(db(), newId))!;
    try {
      return { ok: true as const, version: await publish(db(), item, null, S_ORIGIN) };
    } catch (e: any) {
      return { ok: false as const, errors: (e?.errors ?? [{ reason: String(e?.message ?? e) }]).map((x: any) => ({ id: String(x.directive ?? ""), reason: String(x.reason ?? x) })) };
    }
  }

  async observe(): Promise<ObsS> {
    const imports: ObsS["imports"] = { [A_ORIGIN]: {}, [B_ORIGIN]: {} };
    const l0: ObsS["l0"] = {};
    const flags: ObsS["flags"] = {};
    const subs = await db().prepare("SELECT id, origin, kind, flags FROM subscriptions").all<{ id: string; origin: string; kind: string; flags: string }>();
    const byId = new Map(subs.results.map((s) => [s.id, s]));
    for (const s of subs.results) flags[s.origin] = [...new Set((JSON.parse(s.flags || "[]") as { type: string }[]).map((f) => f.type))].sort();
    const rows = await db().prepare("SELECT * FROM imported_items").all<any>();
    for (const r of rows.results) {
      const s = byId.get(r.subscription_id)!;
      if (s.kind === "rss") {
        const m = /\]\(([^)]+)\)/.exec(r.content_md ?? "");
        l0[m ? m[1] : r.remote_id] = r.version;
        continue;
      }
      const retained = r.state === "tombstone" ? (r.pinned_version_retained ?? null) : null;
      imports[s.origin][r.remote_id] = {
        state: r.state, version: r.version,
        hash: r.state === "current" ? (r.content_hash ?? "") : retained != null ? (r.content_hash ?? "") : "",
        retained, hasContent: r.state === "current" ? true : !!r.content_html,
      };
    }
    const own: ObsS["own"] = {};
    const items = await db().prepare("SELECT * FROM items WHERE version > 0").all<any>();
    for (const it of items.results) {
      const vs = await db().prepare("SELECT * FROM versions WHERE item_id = ? ORDER BY version").bind(it.id).all<any>();
      own[it.id] = {
        versions: vs.results.map((v) => {
          const stub = v.stub_of ? JSON.parse(v.stub_of) : null;
          return {
            version: v.version,
            kind: v.content_md === "" ? "withdrawn" : v.transclusions != null ? "thread" : "fragment",
            ...(v.transclusions ? { transclusions: (JSON.parse(v.transclusions) as any[]).map(stripRef) } : {}),
            ...(stub && stub.origin ? { stub_of: { origin: stub.origin, id: stub.id, version: stub.version } } : {}),
            html: v.content_html ?? "",
            md: v.content_md ?? "",
          };
        }),
        pinned: vs.results.filter((v) => v.pinned === 1).map((v) => v.version),
        ...(it.forked_from ? { forked_from: (({ origin, id, version }) => ({ origin, id, version }))(JSON.parse(it.forked_from)) } : {}),
      };
    }
    return { imports, l0, flags, own };
  }

  async serve(path: string): Promise<Served> {
    const res = await call(`${S_ORIGIN}${path}`);
    return { status: res.status, body: await res.text() };
  }
}
