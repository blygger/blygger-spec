// Merged reading feed (§3.6): own + imported + l0 in clamped order.
import { describe, expect, it } from "vitest";
import { buildReadingFeed, clampDisplayAt } from "../../src/importer/reading.ts";
import type { ImportedEntryInput, OwnEntryInput } from "../../src/importer/reading.ts";

describe("clampDisplayAt() — §3.6", () => {
  it("uses the earlier of claimed updated and observed_at", () => {
    expect(clampDisplayAt("2026-08-01T00:00:00Z", "2026-08-05T00:00:00Z")).toBe("2026-08-01T00:00:00Z");
  });

  it("clamps a future-dated origin to when we actually observed it", () => {
    expect(clampDisplayAt("2099-01-01T00:00:00Z", "2026-08-05T00:00:00Z")).toBe("2026-08-05T00:00:00Z");
  });

  it("falls back to observed_at when claimed updated is missing or unparseable", () => {
    expect(clampDisplayAt(null, "2026-08-05T00:00:00Z")).toBe("2026-08-05T00:00:00Z");
    expect(clampDisplayAt("not a date", "2026-08-05T00:00:00Z")).toBe("2026-08-05T00:00:00Z");
  });

  it("normalizes a foreign-format claimed date rather than passing it through", () => {
    // RFC-822 in, ISO out — the clamp is where a legacy row's raw date last
    // has a chance to become comparable before it becomes a displayAt.
    expect(clampDisplayAt("Wed, 01 Jul 2026 00:00:00 GMT", "2026-08-05T00:00:00Z")).toBe("2026-07-01T00:00:00Z");
  });
});

describe("buildReadingFeed() — §3.6", () => {
  it("merges own + imported + l0 entries into one reverse-chron stream", () => {
    const own: OwnEntryInput[] = [
      { id: "own-1", kind: "fragment", withdrawn: false, updated: "2026-08-05T00:00:00Z", contentHtml: "<p>own</p>" },
    ];
    const imported: ImportedEntryInput[] = [
      {
        subscriptionId: "sub-blyg", subscriptionTitle: "Friend", remoteId: "rid-1", kind: "fragment", withdrawn: false, l0: false,
        updated: "2026-08-06T00:00:00Z", observedAt: "2026-08-06T00:05:00Z", contentHtml: "<p>imported</p>", pinnedVersionRetained: null,
      },
      {
        subscriptionId: "sub-l0", subscriptionTitle: "Legacy Blog", remoteId: "rid-2", kind: "fragment", withdrawn: false, l0: true,
        updated: "2026-08-04T00:00:00Z", observedAt: "2026-08-04T00:00:00Z", contentHtml: "<p>l0</p>", pinnedVersionRetained: null,
      },
    ];
    const feed = buildReadingFeed(own, imported);
    expect(feed.map((e) => e.imported?.remoteId ?? e.own?.id)).toEqual(["rid-1", "own-1", "rid-2"]);
    expect(feed[2].l0).toBe(true);
    expect(feed[0].source).toBe("imported");
    expect(feed[1].source).toBe("own");
  });

  it("sorts by the clamped display time, not the raw claimed updated", () => {
    const imported: ImportedEntryInput[] = [
      {
        subscriptionId: "s", subscriptionTitle: "S", remoteId: "future-dated", kind: "fragment", withdrawn: false, l0: false,
        updated: "2099-01-01T00:00:00Z", observedAt: "2026-08-01T00:00:00Z", contentHtml: "<p>a</p>", pinnedVersionRetained: null,
      },
      {
        subscriptionId: "s", subscriptionTitle: "S", remoteId: "honest", kind: "fragment", withdrawn: false, l0: false,
        updated: "2026-08-10T00:00:00Z", observedAt: "2026-08-10T00:00:00Z", contentHtml: "<p>b</p>", pinnedVersionRetained: null,
      },
    ];
    const feed = buildReadingFeed([], imported);
    // "future-dated" claims 2099 but was only observed 2026-08-01, so it clamps behind "honest"'s 2026-08-10.
    expect(feed.map((e) => e.imported?.remoteId)).toEqual(["honest", "future-dated"]);
  });

  it("carries withdrawn state through for placeholder rendering", () => {
    const imported: ImportedEntryInput[] = [
      {
        subscriptionId: "s", subscriptionTitle: "S", remoteId: "gone", kind: "fragment", withdrawn: true, l0: false,
        updated: "2026-08-05T00:00:00Z", observedAt: "2026-08-05T00:00:00Z", contentHtml: "", pinnedVersionRetained: null,
      },
    ];
    const feed = buildReadingFeed([], imported);
    expect(feed[0].withdrawn).toBe(true);
  });
});

describe("buildReadingFeed() — foreign date formats (live regression)", () => {
  /**
   * Reproduces the order the live venkateshrao reading feed actually showed on
   * 2026-09-12: Jul 1, Jul 28, Jul 9, Jul 12, Jul 5, May 30, May 23, Jun 20,
   * Jul 18. That is descending *lexicographic* order on RFC-822 — day-of-week
   * name first (Wed > Tue > Thu > Sun > Sat), then day-of-month (30 > 23 > 20
   * > 18) — which is why the feed looked shuffled and clustered by source.
   */
  const CONTRAPTIONS = [
    { label: "Jul 28", raw: "Tue, 28 Jul 2026 00:00:00 GMT" },
    { label: "Jul 18", raw: "Sat, 18 Jul 2026 00:00:00 GMT" },
    { label: "Jul 12", raw: "Sun, 12 Jul 2026 00:00:00 GMT" },
    { label: "Jul 9", raw: "Thu, 09 Jul 2026 00:00:00 GMT" },
    { label: "Jul 5", raw: "Sun, 05 Jul 2026 00:00:00 GMT" },
    { label: "Jul 1", raw: "Wed, 01 Jul 2026 00:00:00 GMT" },
    { label: "Jun 20", raw: "Sat, 20 Jun 2026 00:00:00 GMT" },
    { label: "May 30", raw: "Sat, 30 May 2026 00:00:00 GMT" },
    { label: "May 23", raw: "Sat, 23 May 2026 00:00:00 GMT" },
  ];

  function imported(label: string, updated: string): ImportedEntryInput {
    return {
      subscriptionId: "sub-l0", subscriptionTitle: "Contraptions", remoteId: label, kind: "fragment",
      withdrawn: false, l0: true, updated, observedAt: "2026-09-01T00:00:00Z",
      contentHtml: `<p>${label}</p>`, pinnedVersionRetained: null,
    };
  }

  it("orders rows stored in RFC-822 chronologically, not by day-of-week name", () => {
    const feed = buildReadingFeed([], CONTRAPTIONS.map((e) => imported(e.label, e.raw)));
    expect(feed.map((e) => e.imported?.remoteId)).toEqual(
      ["Jul 28", "Jul 18", "Jul 12", "Jul 9", "Jul 5", "Jul 1", "Jun 20", "May 30", "May 23"],
    );
  });

  it("interleaves sources instead of clustering them by date format", () => {
    // Own entries are ISO, legacy entries RFC-822. Compared as text, every
    // digit-leading ISO string sorts below every letter-leading RFC-822 one,
    // so the two sources could never interleave however recent either was.
    const own: OwnEntryInput[] = [
      { id: "own-jul-20", kind: "fragment", withdrawn: false, updated: "2026-07-20T00:00:00Z", contentHtml: "<p>own</p>" },
      { id: "own-jun-01", kind: "fragment", withdrawn: false, updated: "2026-06-01T00:00:00Z", contentHtml: "<p>own</p>" },
    ];
    const feed = buildReadingFeed(own, [imported("Jul 28", "Tue, 28 Jul 2026 00:00:00 GMT"), imported("Jul 1", "Wed, 01 Jul 2026 00:00:00 GMT")]);
    expect(feed.map((e) => e.imported?.remoteId ?? e.own?.id)).toEqual(["Jul 28", "own-jul-20", "Jul 1", "own-jun-01"]);
  });
});
