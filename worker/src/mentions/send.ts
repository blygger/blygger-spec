// Outbound Webmention — v0.3-plan §2.3.3/§2.3.4, decision #28. Publishing
// enqueues; the cron drains. Delivery is fire-and-forget from the author's
// point of view: publish never blocks on it and never fails because of it.

import type { FetchLike } from "../importer/http.ts";
import { blygItemUrl } from "../importer/util.ts";
import { isBlygStub, parseStoredFork, parseStoredStub } from "../stub.ts";
import type { Transclusion, VersionRow } from "../types.ts";
import { discoverEndpoint } from "./discover.ts";
import { dueOutbound, enqueueOutbound, markOutbound, RETRY_SCHEDULE_MS } from "./store.ts";

/** One reference worth telling someone about: where it points, and (for a blyg) whose origin that is. */
export interface RemoteRef {
  target: string;
  origin?: string;
}

/** The permalink of a remote item — its own declared `page` when we hold it, the convention otherwise (§2.3.3). */
async function remotePermalink(db: D1Database, origin: string, id: string): Promise<string> {
  const row = await db
    .prepare(
      `SELECT ii.kind AS kind, ii.page AS page FROM imported_items ii
       JOIN subscriptions s ON s.id = ii.subscription_id
       WHERE ii.remote_id = ? AND s.origin = ?`,
    )
    .bind(id, origin)
    .first<{ kind: string; page: string | null }>();
  return blygItemUrl(origin, row?.kind ?? "fragment", id, row?.page ?? null);
}

/**
 * Every **remote-origin** reference in one published version: the `stub_of`
 * citation (either shape) and every transclusion carrying an `origin`.
 * Same-origin references never generate a mention — telling ourselves
 * something we already know is noise, not notification.
 */
export async function remoteReferences(db: D1Database, itemId: string, row: VersionRow, ourOrigin: string): Promise<RemoteRef[]> {
  const refs: RemoteRef[] = [];
  const stub = parseStoredStub(row.stub_of);
  if (stub) {
    if (isBlygStub(stub)) {
      if (stub.origin !== ourOrigin) refs.push({ target: await remotePermalink(db, stub.origin, stub.id), origin: stub.origin });
    } else {
      refs.push({ target: stub.url });
    }
  }
  for (const t of (JSON.parse(row.transclusions ?? "[]") as Transclusion[])) {
    if (!t.origin || t.origin === ourOrigin) continue;
    refs.push({ target: await remotePermalink(db, t.origin, t.id), origin: t.origin });
  }
  // §2.3.3: lineage is a remote reference like any other. It lives on the
  // item rather than the version (§2.4), so it is read from there — and it
  // targets the *live* permalink, not the pinned-version page, because the
  // receiver verifies a mention against the item its `target` names.
  const fork = parseStoredFork(
    (await db.prepare("SELECT forked_from FROM items WHERE id = ?").bind(itemId).first<{ forked_from: string | null }>())?.forked_from ?? null,
  );
  if (fork && fork.origin !== ourOrigin) {
    refs.push({ target: await remotePermalink(db, fork.origin, fork.id), origin: fork.origin });
  }
  const seen = new Set<string>();
  return refs.filter((r) => (seen.has(r.target) ? false : (seen.add(r.target), true)));
}

/**
 * Queue the mentions for a version that was just published (or withdrawn —
 * §2.3.6 re-sends once, so the receiver can see the source no longer
 * verifies and mark it gone).
 */
export async function enqueueForVersion(
  db: D1Database,
  itemId: string,
  version: number,
  row: VersionRow,
  ourOrigin: string,
): Promise<RemoteRef[]> {
  const refs = await remoteReferences(db, itemId, row, ourOrigin);
  for (const ref of refs) await enqueueOutbound(db, itemId, version, ref.target);
  return refs;
}

/** Which blyg origin, if any, a target URL belongs to — the manifest-first discovery hint (§2.3.4 step 1). */
async function blygOriginFor(db: D1Database, target: string): Promise<string | undefined> {
  const row = await db
    .prepare("SELECT origin FROM subscriptions WHERE kind = 'blyg' AND ? LIKE origin || '%' ORDER BY length(origin) DESC LIMIT 1")
    .bind(target)
    .first<{ origin: string }>();
  return row?.origin;
}

export interface DrainResult {
  attempted: number;
  sent: number;
}

/**
 * One delivery pass over the due queue. Called from the publish path (so a
 * stub arrives while the author is still looking at the screen) and from the
 * cron tick (so a receiver that was down gets it later anyway).
 *
 * Classification follows §2.3.4: 2xx is `sent`; 4xx is terminal except 429;
 * network failures and 5xx retry on 15m → 1h → 4h → 12h → 24h and then give
 * up; no endpoint is not a failure and never retries.
 */
export async function drainOutbound(
  db: D1Database,
  fetchFn: FetchLike,
  opts: { now?: number; origin?: string } = {},
): Promise<DrainResult> {
  const now = opts.now ?? Date.now();
  // The publish path knows the request origin; the cron has only `site_url`.
  const origin = opts.origin ?? (await originSetting(db));
  const due = await dueOutbound(db, new Date(now).toISOString());
  let sent = 0;
  for (const row of due) {
    const source = origin ? await sourceUrlFor(db, row.item_id, origin) : null;
    if (!source) {
      await markOutbound(db, row.id, {
        status: "failed",
        error: origin ? "source item is no longer published" : "no canonical origin: set site_url in settings before sending mentions",
      });
      continue;
    }
    let endpoint = row.endpoint;
    if (!endpoint) {
      const found = await discoverEndpoint(row.target, fetchFn, await blygOriginFor(db, row.target));
      if (!found.endpoint) {
        await markOutbound(db, row.id, { status: "no_endpoint", error: found.reason });
        continue;
      }
      endpoint = found.endpoint;
    }

    const attempts = row.attempts + 1;
    try {
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ source, target: row.target }).toString(),
      });
      if (res.status >= 200 && res.status < 300) {
        await markOutbound(db, row.id, { status: "sent", endpoint, attempts, nextAttemptAt: null, error: null });
        sent++;
        continue;
      }
      const retryable = res.status === 429 || res.status >= 500;
      await scheduleRetry(db, row.id, endpoint, attempts, retryable, `endpoint returned ${res.status}`, now);
    } catch (e) {
      await scheduleRetry(db, row.id, endpoint, attempts, true, `delivery failed: ${(e as Error).message}`, now);
    }
  }
  return { attempted: due.length, sent };
}

async function scheduleRetry(
  db: D1Database,
  id: string,
  endpoint: string,
  attempts: number,
  retryable: boolean,
  error: string,
  now: number,
): Promise<void> {
  const delay = RETRY_SCHEDULE_MS[attempts - 1];
  if (!retryable || delay === undefined) {
    await markOutbound(db, id, { status: "failed", endpoint, attempts, nextAttemptAt: null, error });
    return;
  }
  await markOutbound(db, id, {
    status: "pending",
    endpoint,
    attempts,
    nextAttemptAt: new Date(now + delay).toISOString(),
    error,
  });
}

/** Our own permalink for the referencing item — the `source` a receiver will fetch and verify. */
async function sourceUrlFor(db: D1Database, itemId: string, origin: string): Promise<string | null> {
  const item = await db.prepare("SELECT id, kind, status, version FROM items WHERE id = ?").bind(itemId).first<{
    id: string;
    kind: string;
    status: string;
    version: number;
  }>();
  if (!item) return null;
  let kind = item.kind;
  if (kind === "withdrawn") {
    const prev = await db
      .prepare("SELECT transclusions FROM versions WHERE item_id = ? AND version = ?")
      .bind(itemId, item.version - 1)
      .first<{ transclusions: string | null }>();
    kind = prev?.transclusions ? "thread" : "fragment";
  }
  return `${origin}${kind === "thread" ? "t" : "f"}/${item.id}/`;
}

/**
 * The origin to speak as when no request is in hand (the cron tick). Only
 * `site_url` can answer that — a scheduled worker has no request to derive an
 * origin from — so a deployment that never set it cannot send, and says so
 * rather than inventing a URL that resolves to nothing.
 */
export async function originSetting(db: D1Database): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'site_url'").first<{ value: string }>();
  if (!row?.value) return null;
  return row.value.endsWith("/") ? row.value : row.value + "/";
}

