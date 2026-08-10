// Table-driven tests for the §3.3 transition function — every row plus the
// edge cells (regression, stealth edit, tombstone return, unknown kind,
// hash mismatch/uncovered cells).
import { describe, expect, it } from "vitest";
import { transition } from "../../src/importer/transition.ts";
import type { LocalState } from "../../src/importer/transition.ts";

function doc(overrides: Record<string, unknown> = {}) {
  return {
    id: "item1",
    kind: "fragment",
    version: 1,
    created: "2026-08-01T00:00:00Z",
    updated: "2026-08-01T00:00:00Z",
    content_md: "hello",
    content_html: "<p>hello</p>",
    content_hash: "sha256:aaa",
    author: null,
    media: [],
    ...overrides,
  };
}

const ABSENT: LocalState = { status: "absent" };

describe("transition() — §3.3 table", () => {
  it("absent + fragment/thread -> import", () => {
    for (const kind of ["fragment", "thread"] as const) {
      const r = transition({ local: ABSENT, doc: doc({ kind, version: 3 }) });
      expect(r.next).toEqual({ status: "current", version: 3 });
      expect(r.effect).toEqual({ type: "import", doc: doc({ kind, version: 3 }) });
      expect(r.flags).toEqual([]);
    }
  });

  it("absent + withdrawn -> record tombstone, nothing to import", () => {
    const r = transition({ local: ABSENT, doc: doc({ kind: "withdrawn", version: 2, content_md: "", content_html: "" }) });
    expect(r.next).toEqual({ status: "tombstone", version: 2 });
    expect(r.effect).toEqual({ type: "record-tombstone", version: 2, updated: "2026-08-01T00:00:00Z" });
    expect(r.flags).toEqual([]);
  });

  it("current(v), D.version > v, fragment/thread -> update", () => {
    const local: LocalState = { status: "current", version: 2 };
    const r = transition({ local, doc: doc({ version: 3, content_md: "v3" }), storedContentHash: "sha256:v2" });
    expect(r.next).toEqual({ status: "current", version: 3 });
    expect(r.effect).toEqual({ type: "update", doc: doc({ version: 3, content_md: "v3" }) });
    expect(r.flags).toEqual([]);
  });

  it("current(v), D.version > v, withdrawn -> roll up to null (tombstone)", () => {
    const local: LocalState = { status: "current", version: 2 };
    const r = transition({ local, doc: doc({ kind: "withdrawn", version: 3, content_md: "", content_html: "" }) });
    expect(r.next).toEqual({ status: "tombstone", version: 3 });
    expect(r.effect).toEqual({ type: "rollup-null", version: 3, updated: "2026-08-01T00:00:00Z" });
    expect(r.flags).toEqual([]);
  });

  it("tombstone(v), D.version > v, fragment/thread -> the item returning, reimport", () => {
    const local: LocalState = { status: "tombstone", version: 2 };
    const r = transition({ local, doc: doc({ version: 3, content_md: "back" }) });
    expect(r.next).toEqual({ status: "current", version: 3 });
    expect(r.effect).toEqual({ type: "reimport", doc: doc({ version: 3, content_md: "back" }) });
    expect(r.flags).toEqual([]);
  });

  it("current(v), D.version = v, same content_hash -> no-op", () => {
    const local: LocalState = { status: "current", version: 2 };
    const r = transition({ local, doc: doc({ version: 2, content_hash: "sha256:same" }), storedContentHash: "sha256:same" });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "noop" });
    expect(r.flags).toEqual([]);
  });

  it("tombstone(v), D.version = v, same content_hash -> no-op", () => {
    const local: LocalState = { status: "tombstone", version: 2 };
    const r = transition({
      local,
      doc: doc({ kind: "withdrawn", version: 2, content_md: "", content_html: "", content_hash: "sha256:empty" }),
      storedContentHash: "sha256:empty",
    });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "noop" });
    expect(r.flags).toEqual([]);
  });

  it("current(v), D.version = v, different content_hash -> stealth edit, adopt D, watermark unchanged", () => {
    const local: LocalState = { status: "current", version: 2 };
    const d = doc({ version: 2, content_md: "stealthy", content_hash: "sha256:new" });
    const r = transition({ local, doc: d, storedContentHash: "sha256:old" });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "adopt-stealth", doc: d });
    expect(r.flags).toEqual(["stealth-edit"]);
  });

  it("regression: D.version < watermark on a current item -> keep local, flag, no adoption", () => {
    const local: LocalState = { status: "current", version: 5 };
    const r = transition({ local, doc: doc({ version: 3 }), storedContentHash: "sha256:v5" });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "ignore" });
    expect(r.flags).toEqual(["regression"]);
  });

  it("regression: D.version < watermark on a tombstoned item", () => {
    const local: LocalState = { status: "tombstone", version: 5 };
    const r = transition({ local, doc: doc({ version: 4 }) });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "ignore" });
    expect(r.flags).toEqual(["regression"]);
  });

  it("unparseable: missing id/version -> ignore, flag, local untouched", () => {
    const local: LocalState = { status: "current", version: 2 };
    const r1 = transition({ local, doc: { kind: "fragment", version: 3 } });
    expect(r1.effect).toEqual({ type: "ignore" });
    expect(r1.flags).toEqual(["unparseable"]);
    expect(r1.next).toEqual(local);

    const r2 = transition({ local, doc: { id: "x", kind: "fragment" } });
    expect(r2.flags).toEqual(["unparseable"]);

    const r3 = transition({ local, doc: null });
    expect(r3.flags).toEqual(["unparseable"]);
  });

  it("unknown kind -> ignore, flag, local untouched (§11.4/§5.3 forward-compat)", () => {
    const local: LocalState = { status: "current", version: 2 };
    const r = transition({ local, doc: doc({ version: 3, kind: "future-kind" }) });
    expect(r.effect).toEqual({ type: "ignore" });
    expect(r.flags).toEqual(["unknown-kind"]);
    expect(r.next).toEqual(local);
  });

  it("edge cell: current(v), D.version = v, D.kind = withdrawn — table doesn't name this row, safe ignore+flag", () => {
    const local: LocalState = { status: "current", version: 2 };
    const r = transition({ local, doc: doc({ kind: "withdrawn", version: 2, content_md: "", content_html: "" }) });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "ignore" });
    expect(r.flags).toEqual(["unrecognized-transition"]);
  });

  it("edge cell: tombstone(v), D.version = v, D.kind != withdrawn — safe ignore+flag", () => {
    const local: LocalState = { status: "tombstone", version: 2 };
    const r = transition({ local, doc: doc({ kind: "fragment", version: 2 }) });
    expect(r.next).toEqual(local);
    expect(r.effect).toEqual({ type: "ignore" });
    expect(r.flags).toEqual(["unrecognized-transition"]);
  });

  it("edge cell: tombstone(v), D.version > v, still withdrawn — re-tombstone advances the watermark", () => {
    const local: LocalState = { status: "tombstone", version: 2 };
    const r = transition({ local, doc: doc({ kind: "withdrawn", version: 4, content_md: "", content_html: "" }) });
    expect(r.next).toEqual({ status: "tombstone", version: 4 });
    expect(r.effect).toEqual({ type: "record-tombstone", version: 4, updated: "2026-08-01T00:00:00Z" });
    expect(r.flags).toEqual([]);
  });
});
