// Cron poller wiring — v0.2-plan.md §4.2: "every 15 min, poll subscriptions
// due (default interval 30 min per sub, jittered; backoff per §3.2)."
// Due-selection is a pure function (fake-clock testable); the actual cron
// trigger just calls runScheduledPoll with the real clock and fetch.

import type { SubscriptionRow } from "../types.ts";
import type { FetchLike } from "./http.ts";
import { platformFetch } from "./http.ts";
import { pollSubscription } from "./poll.ts";
import { backoffMs, mapLimit } from "./util.ts";
import { listSubscriptions } from "./store.ts";

export const POLL_INTERVAL_MS = 30 * 60 * 1000;
const JITTER_MS = 5 * 60 * 1000;
const DEGRADE_BACKOFF_CAP_MS = POLL_INTERVAL_MS * 8;
const POLL_CONCURRENCY = 4;

/** Deterministic per-subscription jitter in [-JITTER_MS, JITTER_MS] — spreads otherwise-synchronized subs across the interval, stable across runs (same id -> same offset). */
function jitterFor(subId: string): number {
  let h = 0;
  for (let i = 0; i < subId.length; i++) h = (h * 31 + subId.charCodeAt(i)) >>> 0;
  return (h % (2 * JITTER_MS + 1)) - JITTER_MS;
}

export function isDue(sub: SubscriptionRow, now: number): boolean {
  if (sub.status === "paused") return false;
  if (!sub.last_poll_at) return true;
  const last = Date.parse(sub.last_poll_at);
  if (sub.status === "degraded") {
    return now - last >= backoffMs(sub.fail_count, POLL_INTERVAL_MS, DEGRADE_BACKOFF_CAP_MS);
  }
  return now - last >= POLL_INTERVAL_MS + jitterFor(sub.id);
}

export function dueSubscriptions(subs: SubscriptionRow[], now: number): SubscriptionRow[] {
  return subs.filter((s) => isDue(s, now));
}

export interface ScheduledPollResult {
  due: number;
  polled: number;
}

/** One cron tick: poll every due subscription, bounded concurrency. */
export async function runScheduledPoll(db: D1Database, fetchFn: FetchLike = platformFetch, now: number = Date.now()): Promise<ScheduledPollResult> {
  const subs = await listSubscriptions(db);
  const due = dueSubscriptions(subs, now);
  await mapLimit(due, POLL_CONCURRENCY, (sub) => pollSubscription(db, sub, fetchFn));
  return { due: due.length, polled: due.length };
}
