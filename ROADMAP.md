# Blygger roadmap

What is being worked on across the four Blygger repositories, in priority
order: the top of the list is next. It is one list on purpose. Discussion
happens on the linked issues, and this file only says where each item stands.

- **Area** is the repository: `spec` ([blygger-spec](https://github.com/blygger/blygger-spec)),
  `studio` ([blygger-studio](https://github.com/blygger/blygger-studio), the reference client),
  `org` ([blygger-org](https://github.com/blygger/blygger-org), blygger.org and the official
  blyg) or `com` ([blygger-com](https://github.com/blygger/blygger-com), the blygger.com directory).
- **Est** is relative effort in planning-poker points (1, 2, 3, 5, 8, 13, 20, 40),
  not hours. `?` means it cannot be sized until a question is answered.
- **Status**: `next` (up soon), `later`, `in review` (a contribution is waiting
  for review), `waiting` (on a person or a date, named in the row), `needs ruling`
  (a protocol question decided before any build), `shipped` (with the version;
  shipped rows drop off after a release or two, and the changelogs are the
  permanent record).
- **Open question** is anything to settle before the work starts. It is
  answered when the item is picked up, not in advance.

**To propose something,** open an issue on the repository it belongs to; the
issue templates say which. An issue that is accepted gets a row here linking
to it, and the issue stays open for discussion until the work ships. Protocol
proposals are decided against the spec's rules first. The spec's version ladder
is a different document: [docs/roadmap.md](docs/roadmap.md).

| # | Item | Area | Est | Status | Open question | Link |
|---|---|---|---|---|---|---|
| 1 | Fresh source installs fail their first deploy: `npm run init` writes no `nodejs_compat` | studio | 1 | in review |  | [studio#46](https://github.com/blygger/blygger-studio/pull/46) |
| 2 | A disclosure span at the very end of a post renders inline instead of as a block | studio | 2 | shipped: studio 0.36.0 |  |  |
| 3 | Settings page reorganised into sections | studio | 5 | next |  |  |
| 4 | Custom theme with live preview, shareable as a file, plus a reading typeface | studio | 3 | in review |  | [studio#38](https://github.com/blygger/blygger-studio/issues/38) |
| 5 | Links back to blygger.org and to public collections, each removable in settings | studio | 2 | next | Exactly which links: a footer link to blygger.org and a public collections menu? |  |
| 6 | The blyg's author URL settable in settings (today it is always the blyg's own address) | studio | 2 | shipped: studio 0.36.0 |  |  |
| 7 | Release announcements for every client on the official blyg | org | 3 | shipped: `publish_releases.py`; third-party clients by hand |  |  |
| 8 | Internal `[[id]]` links take a heading as their text when the target has one | studio | 2 | shipped: studio 0.36.0 |  |  |
| 9 | Stub editor: choose the quoted passage in the preview | studio | 5 | next |  |  |
| 10 | Images resized in the browser before upload | studio | 5 | next |  |  |
| 11 | Webmention receiver hardening: per-domain limits, a cap on pending checks | studio | 3 | shipped: studio 0.36.1 |  |  |
| 12 | Read state for imported items, then mark unread | studio | 3 | waiting: rebase |  | [studio#44](https://github.com/blygger/blygger-studio/pull/44), [#45](https://github.com/blygger/blygger-studio/pull/45) |
| 13 | Templated surfaces (§16.6e) promoted to normative text | spec | 2 | waiting: Soapbox's confirmation |  | [spec#2](https://github.com/blygger/blygger-spec/issues/2) |
| 14 | Technical note TN-2: identity practice | spec | 5 | next |  |  |
| 15 | Full backup: download the whole blyg, every version and file, as one archive | studio | 13 | later | Must the archive restore into a fresh node, or is download enough at first? |  |
| 16 | Mentions as a reading and discovery channel: read responses inline, subscribe in one click | studio | 13 | later |  |  |
| 17 | Opt-in blygger.com from the studio: list this blyg, browse the directory | studio | 8 | later | Listing, browsing, or both? |  |
| 18 | Owner password change and reset in settings | studio | 8 | waiting: recovery design |  |  |
| 19 | RFC-1 and RFC-2 comment periods | spec | – | waiting: closes 2026-11-04 |  | [spec#14](https://github.com/blygger/blygger-spec/issues/14), [#15](https://github.com/blygger/blygger-spec/issues/15) |
| 20 | RFC-1 in the studio: address book, @-mentions, member bylines | studio | 20 | waiting: RFC-1 closes |  | [spec#14](https://github.com/blygger/blygger-spec/issues/14) |
| 21 | Conformance and intent toolkit merged | spec | 3 | in review |  | [spec#11](https://github.com/blygger/blygger-spec/pull/11) |
| 22 | The directory runs the conformance toolkit daily | com | 8 | waiting: spec#11 |  | [com#1](https://github.com/blygger/blygger-com/issues/1) |
| 23 | Remote generation sources: generation that draws on another blyg's items, with a `source` mention | studio | 20 | later |  |  |
| 24 | The 0.4 spec document opened | spec | 8 | waiting: item 23 |  |  |
| 25 | Author-chosen text for `[[id]]` links (new syntax in posts) | spec | ? | needs ruling |  |  |
| 26 | Unicode on the wire: normalization and origin comparison | spec | 8 | needs ruling |  | [spec#6](https://github.com/blygger/blygger-spec/issues/6) |
| 27 | Open findings from the first conformance report (partial quotes, closure walk, watermark, required members, grammar edge cases) | spec | 8 | needs ruling |  | [spec#11](https://github.com/blygger/blygger-spec/pull/11) |
| 28 | In-page anchors (footnotes) in imported HTML | studio | 5 | waiting: discussion |  | [studio#39](https://github.com/blygger/blygger-studio/issues/39) |
| 29 | Public pages update immediately after owner changes (edge-cache purge) | studio | ? | waiting: discussion |  |  |
| 30 | AI spending caps: daily, weekly and monthly, in settings | studio | 8 | later |  |  |
| 31 | Discovery from references: quote-chain view, "responds to" walk, second-degree blogrolls | studio | 13 | later |  |  |
| 32 | Self-host template with `npm run upgrade` | studio | 20 | later |  |  |
| 33 | A "you are behind" notice per listed node | com | 5 | later |  |  |
| 34 | Passkey sign-in | studio | 13 | later |  |  |
| 35 | A way to run UI experiments as extensions without changing the reference design | studio | ? | later |  |  |
| 36 | Technical note TN-4: a write surface | spec | 5 | later |  |  |
| 37 | Reference agent and technical note TN-5: the contract between a blyg and an agent | spec | 40 | later |  |  |
| 38 | YouTube links embed on public pages; a failed off-origin image shows as a link | studio | 3 | later |  | [studio#9](https://github.com/blygger/blygger-studio/issues/9) |
| 39 | Author-sized inline images | studio | 3 | needs ruling | The size has to be written in the post, so this is new syntax other clients will meet. | [studio#37](https://github.com/blygger/blygger-studio/issues/37) |
| 40 | Pour-over links: paste a URL and bring the source into the draft | studio | 5 | later |  | [studio#17](https://github.com/blygger/blygger-studio/issues/17) |
| 41 | TK generation through the Workers AI binding, with no API key | studio | 5 | later |  | [studio#8](https://github.com/blygger/blygger-studio/issues/8) |
| 42 | Human-readable permalinks (`page` slugs) | studio | 8 | later |  | [studio#19](https://github.com/blygger/blygger-studio/issues/19) |
| 43 | A richer editor without a vendored dependency | studio | 13 | later |  | [studio#16](https://github.com/blygger/blygger-studio/issues/16) |
| 44 | Publishing patterns: six client affordances | studio | 20 | later | Probably splits into six rows once each is sized. | [studio#18](https://github.com/blygger/blygger-studio/issues/18) |
| 45 | Tangling: publish a thread and its fragments together | studio | 13 | needs ruling | Proposes new syntax in posts. | [studio#20](https://github.com/blygger/blygger-studio/issues/20) |
| 46 | Optional `cid` on pinned versions (IPFS mirror and pin log) | spec | 8 | needs ruling |  | [spec#13](https://github.com/blygger/blygger-spec/issues/13) |
| 47 | Read templated blygs (WordPress via Soapbox) | studio | 8 | shipped 0.35.1 |  | [spec#2](https://github.com/blygger/blygger-spec/issues/2) |
| 48 | The official blyg at blyg.blygger.org, with RFCs and technical notes | org | 5 | shipped |  |  |
