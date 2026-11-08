# Pace-layered order fixtures

The conformance check for [RFC-3](../../docs/rfcs/rfc-3-pace-layered-order.md), the
pace-layered order: fixed publishing histories with the order they produce under the
reference constants, worked by hand. A client that implements the order with the reference
constants passes all of them; one that tunes the constants still implements the order
(RFC-3 R1) and says which values it uses.

**This directory is canonical** (RFC-3 R4, decision #97). Blygger Studio keeps an identical
copy in `test/fixtures/feeds/`, and its CI (`npm run check:fixtures`) fails if the two
differ. Change a fixture here first, then in the studio.

## Format

Each file is one JSON object:

```json
{
  "description": "what the case checks",
  "history": { "items": [ { "id": "a", "kind": "fragment", "withdrawn": false,
    "versions": [ { "version": 1, "at": "2026-10-01T00:01:00Z", "note": null,
                    "pinned": false, "quotes": [], "maintenance": true } ] } ] },
  "expected": ["ids", "top", "first"]
}
```

- `items` are in archive order, oldest first (`items/index.json`, §6.2); it breaks ties
  between equal publication times.
- `quotes` are the own-origin items a version quotes (`transclusions[]` entries with no
  `origin`).
- `maintenance` is the one input that is not on the wire: the client's own judgement that
  the version changed nothing worth resurfacing (same `content_hash` as the version before
  it, #77, or under its near-sameness threshold, #83). Absent means no. RFC-3 R2.
- `expected` lists the visible items, top first; withdrawn items are left out.

## Running

Feed each `history` to your implementation and compare its output with `expected`. The
reference runner is blygger-studio's `test/feeds.test.ts`.

| Fixture | Checks |
|---|---|
| `01-no-pins` | no pins, no revisions: newest first |
| `02-pinned-item-sticks` | two pins put an item in layer 2 |
| `03-versions-climb` | each new version climbs one place; at the top it stays |
| `04-one-climb` | one revision moves one place, not to the top |
| `05-quoted-by-pinned-threads` | pinned quoters pass half their weight to the quoted |
| `06-withdrawn` | a withdrawn item takes no tick; its pins still lend weight |
| `07-maintenance-no-climb` | a maintenance version climbs zero (R2) |
| `08-burst-one-tick` | a burst takes one tick, thread on top, fragments beneath in order (R3) |
| `09-burst-window` | a fragment outside the 15-minute window is not in the burst (R3) |
