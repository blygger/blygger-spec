// The real blygger-studio as node S. Studio source is imported through the
// "@studio" alias (vitest.config.mts → $STUDIO_DIR/src); nothing in that repo is
// modified. Publishing, forking and importing go through the studio's own
// functions against a miniflare D1; pinning and withdrawal go through its owner
// REST contract (so the contract's preconditions apply, expectedRevision
// included); the public surface is read through the Worker's fetch handler,
// exactly as a subscriber would.
//
// This is the one harness in the toolkit that depends on studio internals,
// because it drives the importer with a model network and compares database
// state. Every internal it touches is listed in ../README.md, "Coupling to
// studio internals"; a studio refactor that moves one breaks this file only.
import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import worker from "@studio/index.ts";
import { CLIENT } from "@studio/client.ts";
import { authoredKind, createDraft, createFork, getItem, publish, saveWorkingCopy } from "@studio/model.ts";
import { itemUrl, storedSurface } from "@studio/surface.ts";
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

/** Copy of api.ts's (unexported) quotedLink, 0.49.12: ours, an import's own `page`, else its item document (#85). */
async function quotedLink(quoteOrigin: string, id: string): Promise<string> {
  if (quoteOrigin === S_ORIGIN) {
    const own = await getItem(db(), id);
    if (own) return blygItemUrl(S_ORIGIN, await authoredKind(db(), own), id, null);
  }
  const row = await db()
    .prepare("SELECT ii.kind AS kind, ii.page AS page FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id WHERE ii.remote_id = ? AND s.origin = ?")
    .bind(id, quoteOrigin)
    .first<{ kind: string; page: string | null }>();
  return row ? blygItemUrl(quoteOrigin, row.kind, id, row.page) : itemUrl(quoteOrigin, await storedSurface(db(), quoteOrigin), id);
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
    const res = await call(`${BASE}/blyg/studio/login`, { method: "POST", headers: { origin: BASE }, body: new URLSearchParams({ password: "test-password" }), redirect: "manual" });
    this.cookie = res.headers.get("set-cookie")!.split(";")[0];
    return this.cookie;
  }

  /** Every table's rows as the migrations left them, captured at the first reset. */
  private baseline?: Map<string, Record<string, unknown>[]>;

  /**
   * Back to the freshly migrated database. Since 0.49.x some migrations seed
   * singleton rows that triggers depend on (change_state, 0024: every write to
   * a tracked table fails with "missing change state" without it; oauth_state,
   * 0021), so a reset restores the migrated rows rather than emptying every
   * table. Tables the migrations left empty are emptied first, twice, in case
   * a delete trigger writes into one already emptied.
   */
  async reset() {
    const tables = (await db().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%'").all<{ name: string }>()).results.map((t) => t.name);
    if (!this.baseline) {
      this.baseline = new Map();
      for (const t of tables) this.baseline.set(t, (await db().prepare(`SELECT * FROM "${t}"`).all<Record<string, unknown>>()).results);
    }
    const seeded = tables.filter((t) => this.baseline!.get(t)?.length);
    for (let pass = 0; pass < 2; pass++) for (const t of tables) if (!seeded.includes(t)) await db().prepare(`DELETE FROM "${t}"`).run();
    for (const t of seeded) {
      await db().prepare(`DELETE FROM "${t}"`).run();
      for (const row of this.baseline.get(t)!) {
        const cols = Object.keys(row);
        await db().prepare(`INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...cols.map((c) => row[c])).run();
      }
    }
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

  /** An owner contract call. Item mutations are conditional since contract 5.0.0: expectedRevision is read first. */
  private async mutate(method: string, path: string, id: string) {
    const headers = { cookie: await this.login(), origin: BASE, accept: "application/json" };
    const got = await call(`${BASE}/api/items/${id}`, { headers });
    const revision = got.status === 200 ? ((await got.json()) as any).revision : undefined;
    return call(`${BASE}/api${path}`, { method, headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(revision === undefined ? {} : { expectedRevision: revision }) });
  }

  async withdraw(id: string) {
    const res = await this.mutate("POST", `/items/${id}/withdraw`, id);
    return res.status === 200 ? ((await res.json()) as any).version : null;
  }

  async pin(id: string, n: number) {
    const res = await this.mutate("PUT", `/items/${id}/versions/${n}/pin`, id);
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
    // The same three steps as the studio's fork route (api.ts createForkResponse,
    // 0.49.12): resolveForkSource, then #57's flattenFork, then createFork. The
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
