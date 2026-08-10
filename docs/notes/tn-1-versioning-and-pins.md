# TN-1 — Versioning stays a bare counter: semver, editions, and the pin pattern

**Technical note · non-normative · session 12, 2026-08-10 (Fable + Venkat).
Decision record for locked decision #19.** Technical notes record design
reasoning — especially rejected designs — alongside the normative spec; they
constrain nothing and are citable rationale, not protocol.

## 1. The question

Item versions are a bare integer counter: `version` increments by exactly 1
per publish event (spec §5.2). Venkat proposed switching to semantic
versioning so that version structure could carry an author-asserted
significance signal — the motivating use case being client-side auto-pinning
heuristics ("a node might declare a rule that every major version change be
auto-pinned"), with the auto-pinning logic itself explicitly outside protocol
scope.

The underlying need is real: a machine-readable way for an author to mark a
publish event as *significant*, which client features can key off. The
question is whether version structure is the right carrier. Two designs were
considered and both rejected; the reasoning is worth keeping because the
question will recur.

## 2. Why not semantic versioning

Three independent arguments, each sufficient:

1. **The counter's rigidity is load-bearing.** "Increments by exactly 1"
   means a version number alone tells an importer exactly how many publish
   events it missed, and any decrease is unambiguously a history rewrite —
   the no-silent-regression watermark (decision #18) leans directly on this.
   Under semver, "+1 exactly" becomes "some component incremented": is
   2.3 → 4.0 a gap? Is 2.0 → 1.9.1 a regression or intent? Every comparison
   becomes structured parsing, and origin violations stop being crisply
   detectable.
2. **The counter is wire-permanent surface.** It rides in the GUID scheme
   (`blyg:{id}:v{n}`), pin URLs (`items/{id}/v{n}.json`), `transclusions`
   provenance, and the reserved `![[id@vN]]` and `forked_from` shapes
   (decisions #14/#16). With two live nodes deployed, restructuring it is
   the protocol's first breaking wire migration — a cost that only grows.
3. **Semver encodes the wrong semantics.** Its parts are API compatibility
   claims — patch-vs-minor is a statement about callers not breaking. Prose
   has no callers. Whatever significance structure writing has, it is not
   three-valued compatibility.

## 3. The edition counter-proposal (recorded, also rejected)

An intermediate design was drafted: keep `version` untouched and add an
optional author-asserted `"edition"` integer (default 1, monotonically
non-decreasing, bumped as a deliberate publish-time act). Publishing-native
("second edition"), additive, zero wire breakage; auto-pin heuristics key off
edition bumps; a semver-looking display (`{edition}.{rev}`) derivable as pure
presentation.

Rejected by Venkat — not on cost grounds (the cost is near zero) but on
design-intent grounds, which is the actual content of this note:

## 4. The pin pattern is the significance primitive

The protocol already has a construct for "this state of this work matters":
the **pin** — an irrevocable promise to serve one exact version forever
(spec §8). The design intent is that publishers think *consciously in pins*,
and a parallel significance lane would obscure that:

- **An edition bump is cheap talk; a pin is a costly signal.** Marking a
  version "major" costs nothing and promises nothing. A pin costs an
  irrevocable hosting commitment. The protocol prefers the significance
  signal an author must back with a promise — that asymmetry is what makes
  the signal honest, and it would be exactly the asymmetry a free-floating
  significance field lets authors route around.
- **Version-structure significance is publishing skeuomorphism.** Editions
  and major versions are conventions imported from books and software —
  cosmetic structure over what is, in this medium, a single living stream of
  states with deliberate frozen citations. The medium's own native gesture
  is the pin; dressing the stream up in edition numbers teaches publishers
  the wrong mental model.
- **The motivating feature doesn't need the field.** "Auto-pin on major
  bump" dissolves into pin-suggestion UX: a studio may prompt, nudge, batch,
  or apply any local rule it likes for *proposing* pins — studio sugar, zero
  protocol bytes. This is the standing pattern's next application: AI,
  identity, and editorial convenience are never in the protocol; neither is
  significance markup. What reaches the wire is the pin itself.

Human-readable significance keeps its existing home: the changelog `note`
(free text, per publish event). Machine-readable significance *is* the pin.

## 5. What stands

- `version` remains a bare positive integer, +1 per publish event — the
  protocol's ordering primitive, unchanged everywhere it appears.
- No semver, no edition field, no significance markup on the wire, at any
  level. This is locked decision #19; relitigating it starts from this note.
- Clients remain free to build any pinning convenience (prompts, local
  rules, batch review) on studio-side state — the protocol surface they
  produce is ordinary deliberate pins.
