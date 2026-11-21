# The Agentic feed — plan

**Status:** a plan, not built. Session 77 (2026-11-21), Opus 5.5 with Venkat. ROADMAP row 52, the
priority after studio 0.68.0 (shipped the same session). Venkat answered §8 the same day. A client contract (decision #31), not protocol: nothing here reaches
the wire, so no Fable ruling is needed unless other clients are to share the edition format (§7).

## 1. What it is

Reading has six tabs since 0.68.0 (row 142): Feed, Mentions, Agentic feed, Saved, Background, Raw.
The line between the first and the third is the point of the design (Venkat):

- **The Feed decides by structure only.** Its order (pace-layered by default, or chronological) and
  what it folds or sends to Background come from wire facts and measured rules: same text, small
  edits, refreshed quotes, bursts, supersession. Any AI it uses (the change classifier) judges the
  *size* of a change, never what the content says.
- **The Agentic feed makes editorial judgments**: what you should see, in what order and grouping,
  and how it is presented. The metaphor is an assistant who organizes your reading for you.

Power users are expected to write their own assistants. The Studio ships a basic one, set up in
Settings, which is just one client of the same contract an outside agent uses.

## 2. Signals an assistant can read

All studio-private. Most are readable today with `owner:read`; §4 narrows that.

| Kind | Signal | Today |
|---|---|---|
| Explicit judgments | Thumbs up and down | `signals`, `GET /thumbs` |
| | Hopper adds and removes | `hopper_items`, the interaction log |
| | Saved, and its order | `shelf`, `GET /shelf` |
| | Moving an entry or a whole blyg to Background or back | `reading_placement`, `subscriptions.background` |
| Responses | Stubs, forks, quotes | the interaction log, `GET /interactions` |
| | `[[id]]` links and TK generation sources in your own items | own versions |
| Attention | Read marks, per version | `read_state` (`reading:state`) |
| | Walks through the thicket (reader links, peeks at unfollowed blygs) | `browse_log` |
| Graph | Subscriptions, paused, in Background | `subscriptions` |
| | Address book, handles | `contacts` |
| | Items that name you | `imported_mentions` (the Mentions tab) |
| | Verified responses to your items | `mentions_in` |
| Structure | Versions, changelog notes, pins, quotes, `links[]`, `generated[]`, syndication, lineage | imported items; changelogs kept since migration 0051 |
| | Background reasons, pace-layered position, the change classifier's categories (own items) | 0.62–0.68 |
| Your writing | Everything you have published, as a model of your interests | own items |
| Your brief | The agentic feed prompt | `feed_prompt` (Settings → AI → agentic feed) |

**Not recorded yet:** time on an item, session length, who you read most, scroll depth, search
queries. They become an opt-in class, a checkbox each, off by default (§8, answer 4).

## 3. The edition: what an assistant writes

The assistant does not render anything. It writes an **edition**: a structured, studio-private
document that the Studio renders in the Agentic feed tab.

```json
{
  "revision": 12,
  "generatedAt": "2026-11-21T18:00:00Z",
  "agent": { "name": "resident", "model": "claude-sonnet-5-5" },
  "sections": [
    {
      "title": "The protocol arguments this week",
      "note": "Three posts answering each other about pins.",
      "entries": [
        { "source": "imported", "sub": "11ks…", "id": "1k37…", "version": 3,
          "reason": "Answers your stub of Tuesday", "present": "full" },
        { "source": "imported", "sub": "6qax…", "id": "0175…", "present": "folded",
          "group": "same-story" }
      ]
    }
  ]
}
```

- **Entries are references** to reading identities the node already holds: source, sub, id, and
  optionally the version the judgment was made on. The Studio drops any reference it cannot
  resolve. An assistant can therefore never put anyone's content on the page; it can only choose
  among what you read.
- **Presentation is a closed set** of fields the Studio knows how to draw: `present` (full,
  excerpt, folded, title only), `group` (fold several entries under one), `reason` (one line,
  "why you're seeing this"), and section `title` and `note`. New presentation ideas (§6) arrive as
  new fields, so the resident and outside assistants gain them together.
- **Text the assistant writes is shown as the assistant's** — reasons, notes, titles — and
  disclosed as generated, as the Studio already does for model text (the mods promise). Free text
  is allowed (§8, answer 1).
- **Optional per-entry scores.** An assistant that only ranks can send `scores` instead of
  sections; the Studio lays out a default edition from them (one section, by score). Both modes
  are supported (§8, answer 3).

## 4. The contract

Follows the Saved pattern (#135/#137) so it reads as familiar.

- `GET /agentic` (`reading:read`): the current edition and its `revision`.
- `PUT /agentic` (`reading:curate`): replace the edition; takes `expectedRevision`, answers 409
  on a stale one. Validated against the closed field set; unknown fields are refused with 400.
- `POST /agentic/runs` (`reading:curate`, optional): an append-only log of what a run looked at
  and decided, shown under the tab's ⋯ as "how this edition was made".
- Polling, not webhooks (#39): an assistant reads `/reading`, `/interactions` and friends with
  conditional reads (#152) and writes when something changed.
- **MCP** exposes the same operations under the same scopes, as for everything else (#52).

**Two new scopes.**

- `reading:read`: reading entries, imported text, signals, interactions, read state, browse log,
  subscriptions, Saved and the edition. Not drafts, not settings, not tokens. Today an assistant
  needs `owner:read`, which also reads unpublished drafts; this is the narrow grant an outside
  assistant should ask for.
- `reading:curate`: write the edition and its run log, and nothing else. It cannot publish, draft,
  or change the Feed's order or Background.
- Side effects are separate opt-in grants (§8, answer 2): `reading:state` (exists) to mark read,
  and a new `reading:save` to add to or remove from Saved.

The Access page lists grants with these scopes like any other, with per-grant revoke and
revoke-all (#31).

## 5. The resident assistant

A basic assistant on the node, so the tab works with no outside setup.

- Runs on the 15-minute cron when the reading collection's generation has moved and the owner has
  chosen it, under the AI budget (today `AI_DAILY_CALL_LIMIT`; pending call #10's budget model
  when it lands).
- Uses the agentic feed model (`ai_model_feed`) and prompt (`feed_prompt`). Input: the newest
  entries (window like the pace-layered order's), their wire structure, and the owner's signals.
  Output: an edition, written through the same `PUT` an outside assistant uses.
- **§14 applies:** imported text is fetched text fed to a model, so the prompt frames it as data.
  The output is a constrained structure, so an injected instruction can at most misplace an entry
  in the edition. It cannot act.
- **Settings → AI → agentic feed** chooses the driver: off, the resident assistant, or an outside
  grant (named). Only the chosen driver's `PUT` is accepted, so two assistants never fight over
  one edition.

## 6. Other AI presentation choices that belong here

Each is a future edition field, never a Feed behaviour:

- digests of a long thread, or "what changed since you last read it" across versions;
- clustering by topic; folding the same story across blygs;
- ranking by relation to your own writing (Surya's case, studio#57);
- a reading-time budget ("twenty minutes today");
- translation;
- explaining a quote chain in context.

## 7. Boundaries

- **The Feed stays structural.** No scope lets an assistant reorder the Feed or move entries to
  its Background. Editorial judgments stay in the Agentic feed tab.
- **Notes (#96):** an assistant following the owner's prompt may read changelog notes; that is
  the owner instructing their own client, which #96 permits. Nothing reaches the wire.
- **Protocol:** none. If another client should read or write the same editions, the format goes
  the #66 route (an RFC) before anyone promises it.
- **Studio should be boring** (#35): the Studio ships the contract, the rendering and a plain
  resident assistant; inventive assistants belong outside it.

## 8. Venkat's answers (session 77, 2026-11-21)

1. **Assistant text: yes.** Section notes, reasons and titles may be free text, always shown as
   the assistant's and disclosed as generated.
2. **Side effects: yes, by opt-in scopes.** A curating assistant may mark entries read
   (`reading:state`, which exists) and add to Saved (a new `reading:save`), each a separate grant
   the owner chooses. `reading:curate` alone still writes only the edition.
3. **Both modes.** An assistant may submit a whole edition or per-entry scores; with scores the
   Studio lays out the edition. The mode is per `PUT` (`sections` or `scores`, never both).
4. **Attention signals: an opt-in class, controlled by the owner.** Whatever raw signals a
   platform would track — time on an item, time and length per browsing session, who the owner
   tends to read more, scroll depth, search queries — the Studio may record, but only with a
   checkbox per signal in Settings, off by default. Recorded signals stay studio-private, are
   readable under `reading:read` like the rest, are listed with their retention on the signals
   page, and can be cleared. Turning a box off stops recording and offers to delete what was
   kept.

## 9. Build order

1. The scopes (`reading:read`, `reading:curate`, `reading:save`), with their oracle laws (the
   auth oracles are Kyle's to approve).
2. `GET`/`PUT /agentic` with the closed field set, `expectedRevision`, and the tab rendering an
   edition (sections, reasons, folds, groups), with the empty state pointing to Settings.
3. The resident assistant on the cron, under the budget, with §14 framing.
4. The driver choice in Settings, and the run log.
5. A worked outside assistant as an example (a script using a manual token), in `docs/`.
6. The opt-in attention signals (§8, answer 4): a Settings section of checkboxes, recording only
   what is checked, a retention line and a clear button for each, and their reads under
   `reading:read`.
