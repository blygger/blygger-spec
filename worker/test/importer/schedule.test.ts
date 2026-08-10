// Cron poller due-selection (§4.2) — fake clock, no real timers: polls due
// subs only.
import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../../src/index.ts";
import { dueSubscriptions, isDue, POLL_INTERVAL_MS, runScheduledPoll } from "../../src/importer/schedule.ts";
import { createSubscription, getSubscription } from "../../src/importer/store.ts";
import { makeFixtureFetch } from "./fixtures.ts";
import type { SubscriptionRow } from "../../src/types.ts";

const NOW = Date.parse("2026-08-10T12:00:00Z");

function sub(overrides: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: "sub1",
    kind: "blyg",
    origin: "https://a.example/",
    feed_url: "https://a.example/feed.xml",
    title: "A",
    status: "active",
    etag: null,
    last_modified: null,
    last_poll_at: null,
    newest_guid: null,
    fail_count: 0,
    last_index_sync_at: null,
    in_blogroll: 0,
    flags: "[]",
    created: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("due-selection (§4.2)", () => {
  it("never-polled subscriptions are always due", () => {
    expect(isDue(sub({ last_poll_at: null }), NOW)).toBe(true);
  });

  it("a subscription polled recently is not due", () => {
    const recent = new Date(NOW - 60_000).toISOString();
    expect(isDue(sub({ last_poll_at: recent }), NOW)).toBe(false);
  });

  it("a subscription polled well past the interval is due", () => {
    const old = new Date(NOW - POLL_INTERVAL_MS - 10 * 60_000).toISOString();
    expect(isDue(sub({ last_poll_at: old }), NOW)).toBe(true);
  });

  it("paused subscriptions are never due, regardless of last_poll_at", () => {
    expect(isDue(sub({ status: "paused", last_poll_at: null }), NOW)).toBe(false);
    const old = new Date(NOW - POLL_INTERVAL_MS * 10).toISOString();
    expect(isDue(sub({ status: "paused", last_poll_at: old }), NOW)).toBe(false);
  });

  it("degraded subscriptions use exponential backoff, not the plain interval", () => {
    const justOverInterval = new Date(NOW - POLL_INTERVAL_MS - 1000).toISOString();
    // fail_count high enough that backoff exceeds the plain interval -> not due yet.
    expect(isDue(sub({ status: "degraded", fail_count: 5, last_poll_at: justOverInterval }), NOW)).toBe(false);
  });

  it("dueSubscriptions filters a mixed list to exactly the due ones", () => {
    const old = new Date(NOW - POLL_INTERVAL_MS * 2).toISOString();
    const recent = new Date(NOW - 60_000).toISOString();
    const subs = [
      sub({ id: "due-1", last_poll_at: old }),
      sub({ id: "not-due", last_poll_at: recent }),
      sub({ id: "paused", status: "paused", last_poll_at: old }),
      sub({ id: "due-2", last_poll_at: null }),
    ];
    const due = dueSubscriptions(subs, NOW).map((s) => s.id);
    expect(due.sort()).toEqual(["due-1", "due-2"]);
  });
});

describe("runScheduledPoll()", () => {
  it("polls only due subscriptions, leaving recently-polled ones untouched", async () => {
    const dueSub = await createSubscription(env.DB, { kind: "blyg", origin: "https://due.example/", feedUrl: "https://due.example/feed.xml", title: "Due" });
    const freshSub = await createSubscription(env.DB, { kind: "blyg", origin: "https://fresh.example/", feedUrl: "https://fresh.example/feed.xml", title: "Fresh" });
    const now = Date.now();
    await env.DB.prepare("UPDATE subscriptions SET last_poll_at = ? WHERE id = ?").bind(new Date(now - 60_000).toISOString(), freshSub.id).run();

    const { fetch, calls } = makeFixtureFetch({ "https://due.example/feed.xml": { status: 304 } });
    const result = await runScheduledPoll(env.DB, fetch, now);

    expect(result.due).toBe(1);
    expect(calls).toEqual(["https://due.example/feed.xml"]);
    expect((await getSubscription(env.DB, dueSub.id))?.last_poll_at).not.toBeNull();
    expect((await getSubscription(env.DB, freshSub.id))?.last_poll_at).toBe(new Date(now - 60_000).toISOString());
  });
});

describe("scheduled() export", () => {
  it("is wired and runs cleanly with zero subscriptions (no network attempted)", async () => {
    const controller = createScheduledController();
    const ctx = createExecutionContext();
    await worker.scheduled!(controller, env, ctx);
    await waitOnExecutionContext(ctx);
  });
});
