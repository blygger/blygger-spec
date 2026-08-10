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
