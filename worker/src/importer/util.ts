// Small helpers shared by the poll cycle and cron wiring.

/** Run `fn` over `items` with at most `limit` in flight at once (§3.2: "bounded concurrency ~4"). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Exponential backoff, §3.2: min(2^fails * base, cap). */
export function backoffMs(fails: number, baseMs: number, capMs: number): number {
  return Math.min(2 ** fails * baseMs, capMs);
}
