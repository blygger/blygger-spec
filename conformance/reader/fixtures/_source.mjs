// Authoring source of the reader fixture corpus. `node fixtures/_source.mjs`
// rewrites fixtures/*.json from the list below; the JSON files are the corpus
// and this file is only a convenient way to write them.
//
// Every expectation here is written from the spec text (docs/protocol-v0.4.md,
// the living 0.4 document), never recorded from a client. Where the text left
// a choice, the case carries `ambiguous` with the reading chosen; a renderer
// that differs on such a case gets a warning, not a failure.
//
// All content is synthetic. Ids are valid lowercase Crockford base32 (§5.1).
import { createHash } from "node:crypto";
import { readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { project } from "../lib/html.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export const SNAPSHOT = {
  snapshot: "spec/0.4/2026-10-18",
  text: "docs/protocol-v0.4.md at blygger-spec 8e8bce5 (seventh revision, 2026-11-01)",
  note: "Revisions two to seven of 0.4 are not snapshotted; the label bake (data-blyg-label, #81), links[] (#79), CommonMark blockquote extent (#76) and LF/CRLF line endings (#76) come from them, so those cases cite the living text.",
};

// ── The world every case draws its referenced items from ──────────────────
const SELF_ORIGIN = "https://home.example/";
const R1 = "https://remote.example/";
const R2 = "https://other.example/";

// Local items (the publishing blyg's own). A renderer under test is told
// their ids, pages and rendered HTML; the studio adapter publishes them.
const LF = "01j9zq3k4m5n6p7q8r9s0t1v2w"; // fragment
const LN = "01j9zq3k4m5n6p7q8r9s0t1v6a"; // fragment with markup and an ampersand
const LT = "01j9zq3k4m5n6p7q8r9s0t1v3x"; // thread quoting LF
const LD = "01j9zq3k4m5n6p7q8r9s0t1v4y"; // draft, never published
const LG = "01j9zq3k4m5n6p7q8r9s0t1v5z"; // published, then withdrawn
const LLOOP = "01j9zq3k4m5n6p7q8r9s0t1v7b"; // thread quoting SELF (closure case)
export const SELF = "01j9zq3k4m5n6p7q8r9s0t1vzz"; // the item each case publishes

// Remote items, at two other origins.
const RA = "7c9wk2mhq0v3xj8tn5rzfd41bg"; // fragment, v2 current, v1 pinned
const RB = "1vgtgz0gq5b2c9k7d3m8r4n6xy"; // fragment, Devanagari
const RC = "4zss0yg5f5zbh48e22s4f87003"; // thread: partial-quotes RA, links RB
const RP = "5d6e7f8g9h0j1k2m3n4p5q6r7s"; // fragment with an absolute `page` (§5.8)
const RN = "6a7b8c9d0e1f2g3h4j5k6m7n8p"; // fragment with no `page`
const RH = "2h2h2h2h2h2h2h2h2h2h2h2h2h"; // fragment whose HTML carries a link
const RR = "2r2r2r2r2r2r2r2r2r2r2r2r2r"; // fragment whose HTML carries a relative link (a non-conformant source)
const RW = "8w8w8w8w8w8w8w8w8w8w8w8w8w"; // withdrawn at its origin, v1 pinned and retained
const RX = "9x9x9x9x9x9x9x9x9x9x9x9x9x"; // withdrawn at its origin, nothing pinned
const RM = "3m3m3m3m3m3m3m3m3m3m3m3m3m"; // the same id at two origins
const UNKNOWN = "0zzzzzzzzzzzzzzzzzzzzzzzzz";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sha = (s) => "sha256:" + createHash("sha256").update(s, "utf8").digest("hex");
const bq = (id, version, html, { origin, label, partial } = {}) =>
  `<blockquote class="blyg-transclusion${partial ? " blyg-partial" : ""}" data-blyg-id="${id}" data-blyg-version="${version}"${origin ? ` data-blyg-origin="${origin}"` : ""}${label !== undefined ? ` data-blyg-label="${esc(label)}"` : ""}>\n${html}</blockquote>\n`;

const LF_MD = "Small tools, used daily, beat big tools used rarely.";
const LN_MD = "Notebooks & pencils are *slow* thinking.";
const LT_MD = `A thread about notebooks.\n\n![[${LF}]]\n\nClosing thought.`;
const RA1_MD = "Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.";
const RA2_MD = RA1_MD + "\n\nA second paragraph about *emphasis* and traces left in the environment.";
const RA1_HTML = `<p>${RA1_MD}</p>\n`;
const RA2_HTML = RA1_HTML + "<p>A second paragraph about <em>emphasis</em> and traces left in the environment.</p>\n";
const RB_MD = "धर्म और कर्म — यह माध्यम ही संदेश है। The medium is the message.";
const RC_MD = `Opening line of a remote thread.\n\n![[${RA}]]\n> Stigmergy is what a protocol looks like from inside\n\nClosing line with a link to [[${RB}]].`;
const RC_HTML = `<p>Opening line of a remote thread.</p>\n` +
  bq(RA, 2, `<p>Stigmergy is what a protocol looks like from inside</p>\n`, { partial: true }) +
  `<p>Closing line with a link to <a href="${R1}f/${RB}/">the medium</a>.</p>\n`;

const local = (id, kind, md, html, extra = {}) => ({ id, origin: SELF_ORIGIN, local: true, kind, version: 1, state: "published", page: `${kind === "thread" ? "t" : "f"}/${id}/`, content_md: md, content_html: html, ...extra });
const remote = (origin, id, kind, md, html, extra = {}) => ({ id, origin, local: false, kind, version: 1, state: "published", page: `${kind === "thread" ? "t" : "f"}/${id}/`, content_md: md, content_html: html, ...extra });

export const WORLD = {
  [LF]: local(LF, "fragment", LF_MD, `<p>${LF_MD}</p>\n`),
  [LN]: local(LN, "fragment", LN_MD, `<p>Notebooks &amp; pencils are <em>slow</em> thinking.</p>\n`),
  [LT]: local(LT, "thread", LT_MD, `<p>A thread about notebooks.</p>\n${bq(LF, 1, `<p>${LF_MD}</p>\n`)}<p>Closing thought.</p>\n`, { transclusions: [{ id: LF, version: 1 }] }),
  [LD]: local(LD, "fragment", "Not yet published.", "", { state: "draft", version: 0 }),
  [LG]: local(LG, "fragment", "", "", { state: "withdrawn", version: 2, kind: "withdrawn", page: `f/${LG}/`, history: [{ version: 1, content_md: "Words withdrawn later." }] }),
  [LLOOP]: local(LLOOP, "thread", `Looping back:\n\n![[${SELF}]]`, `<p>Looping back:</p>\n${bq(SELF, 1, "<p>First version of this thread.</p>\n")}`, { transclusions: [{ id: SELF, version: 1 }], needs_self: true }),
  [RA]: remote(R1, RA, "fragment", RA2_MD, RA2_HTML, { version: 2, pins: { 1: { content_md: RA1_MD, content_html: RA1_HTML } } }),
  [RB]: remote(R1, RB, "fragment", RB_MD, `<p>${RB_MD}</p>\n`),
  [RC]: remote(R1, RC, "thread", RC_MD, RC_HTML, { transclusions: [{ id: RA, version: 2, selector: { exact: "Stigmergy is what a protocol looks like from inside" } }], links: [{ id: RB }] }),
  [RP]: remote(R1, RP, "fragment", "Pencils, again.", "<p>Pencils, again.</p>\n", { page: "https://www.remote.example/2026/pencils/" }),
  [RN]: remote(R1, RN, "fragment", "A fragment whose document names no page.", "<p>A fragment whose document names no page.</p>\n", { page: null }),
  [RH]: remote(R1, RH, "fragment", "Thinking with a [pencil](https://pencils.example/) is *slow*.", `<p>Thinking with a <a href="https://pencils.example/">pencil</a> is <em>slow</em>.</p>\n`),
  [RR]: remote(R1, RR, "fragment", "See [the notes](notes/) for more.", `<p>See <a href="notes/">the notes</a> for more.</p>\n`),
  [RW]: remote(R1, RW, "withdrawn", "", "", { version: 2, state: "withdrawn-retained", retained: 1,
    pins: { 1: { content_md: "Pinned words that outlive withdrawal.", content_html: "<p>Pinned words that outlive withdrawal.</p>\n" } },
    history: [{ version: 1, content_md: "Pinned words that outlive withdrawal.", content_html: "<p>Pinned words that outlive withdrawal.</p>\n", pinned: true }] }),
  [RX]: remote(R1, RX, "withdrawn", "", "", { version: 2, state: "withdrawn",
    history: [{ version: 1, content_md: "Words that will not survive.", content_html: "<p>Words that will not survive.</p>\n" }] }),
  [RM + "@1"]: remote(R1, RM, "fragment", "One of two.", "<p>One of two.</p>\n"),
  [RM + "@2"]: remote(R2, RM, "fragment", "The other of two.", "<p>The other of two.</p>\n"),
};
for (const it of Object.values(WORLD)) if (it.content_md && !it.local) it.content_hash = sha(it.content_md);

const W = (id, o) => WORLD[id] ?? WORLD[`${id}@${o}`];
const pageUrl = (it) => (it.page && /^https?:/.test(it.page) ? it.page : it.origin + it.page);
const isLocal = (id) => WORLD[id]?.local;

// ── Expected-HTML builders ──────────────────────────────────────────────────
// Each returns the HTML a markdown renderer would plausibly emit. Only the
// normative parts are compared (lib/html.mjs project()); the rest of the
// string is a readable illustration. The `data-x-*` markers tell project()
// what an anchor promises and are stripped before a fixture is written.
const P = (...parts) => `<p>${parts.join("")}</p>\n`;
const t = esc;
/** A `[[id]]` link. With a label the anchor text is normative (§10.1); without, it is the publisher's choice. */
const L = (id, label) => {
  const it = W(id, 1);
  return `<a href="${pageUrl(it)}"${label === undefined ? " data-x-presentation-text" : ""}>${label === undefined ? "…" : esc(label)}</a>`;
};
const A = (href, text, absoluteOnly) => `<a href="${href}"${absoluteOnly ? " data-x-absolute-only" : ""}>${esc(text)}</a>`;
/** A whole transclusion of an item as the publisher holds it (§10.2). */
const Q = (id, opts = {}) => {
  const it = W(id, opts.at ?? 1);
  const version = opts.version ?? (it.state === "withdrawn-retained" ? it.retained : it.version);
  const html = opts.html ?? (it.state === "withdrawn-retained" ? it.pins[it.retained].content_html : it.content_html);
  return bq(id, version, html, { origin: it.local ? undefined : it.origin, label: opts.label });
};
/** A partial transclusion: one <p> per line of the selection, plain text, escaped (§10.2). */
const QP = (id, lines, opts = {}) => {
  const it = W(id, 1);
  return bq(id, it.version, lines.map((l) => `<p>${esc(l)}</p>\n`).join(""), { origin: it.local ? undefined : it.origin, label: opts.label, partial: true });
};
const GS = (inner) => `<span class="blyg-tk-gen">${inner}</span>`;
const GD = (inner) => `<div class="blyg-tk-gen">${inner}</div>\n`;
const CODE = (s) => `<code>${esc(s)}</code>`;
const PRE = (s) => `<pre><code>${esc(s)}\n</code></pre>\n`;
const BQ = (inner) => `<blockquote>\n${inner}</blockquote>\n`;

/** transclusions[] entries (§10.3): origin omitted for own-origin sources. */
const TR = (id, extra = {}) => {
  const it = W(id, 1);
  const version = extra.version ?? (it.state === "withdrawn-retained" ? it.retained : it.version);
  const e = { id, version };
  if (!it.local) e.origin = it.origin;
  if (extra.exact !== undefined) e.selector = { exact: extra.exact };
  return e;
};
/** links[] entries (§10.3a): id, and origin when remote; nothing else. */
const LK = (id) => (isLocal(id) ? { id } : { id, origin: W(id, 1).origin });
/** generated[] entries (§5.7): only `sources` is compared. */
const GEN = (...ids) => ({ sources: ids.map((id) => { const it = W(id, 1); const s = { id, version: it.version }; if (!it.local) s.origin = it.origin; return s; }) });

// ── Cases ──────────────────────────────────────────────────────────────────
// c(group, id, title, { kind, md, items, html, error, literals, tr, links, gen, spec, clauses, decisions, ambiguous, seed, self_prior })
const cases = [];
const c = (group, id, title, o) => cases.push({ group, id, title, ...o });

// grammar — §10.1 directive and link recognition
c("grammar", "directive-local-whole", "An own-line directive naming a local fragment is a whole transclusion", {
  md: `Intro.\n\n![[${LF}]]\n\nOutro.`, items: [LF], html: P("Intro.") + Q(LF) + P("Outro."), tr: [TR(LF)],
  spec: ["§10.1", "§10.2", "§10.3"], clauses: ["C-10.2-01"], decisions: ["#9"], seed: "tr_found_local_fragment" });
c("grammar", "directive-remote-whole", "An own-line directive naming an imported item bakes it with data-blyg-origin", {
  md: `![[${RA}]]`, items: [RA], html: Q(RA), tr: [TR(RA)], spec: ["§10.1", "§10.2", "§10.3"], clauses: ["C-10.2-01"], decisions: ["#26"], seed: "tr_found_remote" });
c("grammar", "directive-surrounding-whitespace", "Spaces and tabs around the directive are allowed", {
  md: `   ![[${RA}]] \t`, items: [RA], html: Q(RA), tr: [TR(RA)], spec: ["§10.1"], decisions: ["#9"] });
c("grammar", "directive-between-prose-lines", "The grammar is line-based: a directive line between two prose lines with no blank line still transcludes", {
  md: `Line before\n![[${LF}]]\nLine after`, items: [LF], html: P("Line before") + Q(LF) + P("Line after"), tr: [TR(LF)], spec: ["§10.1"], decisions: ["#9"], seed: "tr_adjacent_to_prose" });
c("grammar", "directive-inline-inert", "A directive that is not alone on its line is inert text, and not a link", {
  md: `Text ![[${RA}]] inline.`, items: [RA], html: P(t(`Text ![[${RA}]] inline.`)), literals: [`![[${RA}]]`], tr: [], links: [],
  spec: ["§10.1"], decisions: ["#9"], seed: "tr_inline_literal" });
c("grammar", "directive-inline-beside-link", "On one line, ![[a]] is inert and [[b]] is a link", {
  md: `![[${RA}]] and [[${RB}]]`, items: [RA, RB], html: P(t(`![[${RA}]] and `), L(RB)), literals: [`![[${RA}]]`], tr: [], links: [LK(RB)], spec: ["§10.1", "§10.3a"], decisions: ["#9", "#79"] });
c("grammar", "directive-in-blockquote-line", "A directive behind a blockquote marker is not alone on its line: inert", {
  md: `> ![[${LF}]]`, items: [LF], html: BQ(P(t(`![[${LF}]]`))), literals: [`![[${LF}]]`], tr: [], spec: ["§10.1"], decisions: ["#9"], seed: "tr_in_blockquote_literal" });
c("grammar", "directive-reserved-version", "![[id@vN]] is reserved: a publisher MUST reject it", {
  md: `![[${RA}@v1]]`, items: [RA], error: true, spec: ["§10.1"], clauses: ["C-10.1-01"], decisions: ["#9"], seed: "tr_reserved_version" });
c("grammar", "directive-reserved-version-inline", "The reserved form inline in prose", {
  md: `See ![[${RA}@v1]] here.`, items: [RA], html: P(t(`See ![[${RA}@v1]] here.`)), literals: [`![[${RA}@v1]]`], tr: [], spec: ["§10.1"], decisions: ["#9"],
  ambiguous: "§10.1 says publishers MUST reject `![[id@vN]]`, and also that a directive sequence anywhere but alone on its line is inert text. The expectation reads the reservation as applying to the directive (an own-line construct), so the inline sequence is inert and publishes. Rejecting it would also be a defensible reading." });
c("grammar", "directives-in-order", "Several directives, adjacent and separated, bake in directive order", {
  md: `![[${LF}]]\n![[${RA}]]\n\n![[${RB}]]`, items: [LF, RA, RB], html: Q(LF) + Q(RA) + Q(RB), tr: [TR(LF), TR(RA), TR(RB)], spec: ["§10.1", "§10.3"], decisions: ["#26", "#76"], seed: "tr_two_quotes" });
c("grammar", "same-target-twice", "A target quoted twice has two transclusions[] entries", {
  md: `![[${LF}]]\n\nBetween.\n\n![[${LF}]]`, items: [LF], html: Q(LF) + P("Between.") + Q(LF), tr: [TR(LF), TR(LF)], spec: ["§10.3"], decisions: ["#76"] });
c("grammar", "crlf-line-endings", "A line ends at LF or CRLF alike: partial transclusion and link with CRLF", {
  md: `Intro.\r\n\r\n![[${RA}]]\r\n> Stigmergy is what a protocol looks like from inside\r\n\r\nSee [[${RB}]].\r\n`, items: [RA, RB],
  html: P("Intro.") + QP(RA, ["Stigmergy is what a protocol looks like from inside"]) + P("See ", L(RB), "."),
  tr: [TR(RA, { exact: "Stigmergy is what a protocol looks like from inside" })], links: [LK(RB)], spec: ["§10.1"], decisions: ["#76", "#49"] });
c("grammar", "uppercase-id-literal", "An id is lowercase (§5.1): uppercase brackets are literal text", {
  md: `![[${LF.toUpperCase()}]]\n\nSee [[${LF.toUpperCase()}]].`, items: [LF], html: P(t(`![[${LF.toUpperCase()}]]`)) + P(t(`See [[${LF.toUpperCase()}]].`)),
  literals: [`![[${LF.toUpperCase()}]]`, `[[${LF.toUpperCase()}]]`], tr: [], links: [], spec: ["§10.1", "§5.1"], decisions: ["#70"], seed: "tr_uppercase_literal" });
c("grammar", "bracketed-non-ids-literal", "Brackets whose first 26 characters are not an id, or an id not followed by ]] or |, are literal", {
  md: `[[just words]] [[short]] [[ ${LF}]] [[${LF}x]]`, items: [LF], html: P(t(`[[just words]] [[short]] [[ ${LF}]] [[${LF}x]]`)),
  literals: ["[[just words]]", "[[short]]", `[[ ${LF}]]`, `[[${LF}x]]`], tr: [], links: [], spec: ["§10.1"], decisions: ["#70"], seed: "link_not_ids" });
c("grammar", "directive-in-fragment", "A directive in a fragment does not produce a baked transclusion", {
  kind: "fragment", md: `Opening.\n\n![[${LF}]]\n\nClosing.`, items: [LF], error: "either", html: P("Opening.") + P(t(`![[${LF}]]`)) + P("Closing."),
  spec: ["§10", "§10.3", "§5.3"], decisions: ["#9"], seed: "tr_in_fragment",
  ambiguous: "§10 defines transclusion for threads and §10.3 says fragments omit `transclusions` entirely, so a fragment can carry no baked quote with provenance. The text does not say whether a directive in a fragment is a publish error or inert text. The expectation accepts either, and fails only a bake." });
c("grammar", "directive-tab-indented", "A tab-indented directive line at the start of a document", {
  md: `\t![[${LF}]]`, items: [LF], html: PRE(`![[${LF}]]`), literals: [`![[${LF}]]`], tr: [], spec: ["§10.1"], decisions: ["#9", "#54"], seed: "tr_tabs",
  ambiguous: "§10.1 allows surrounding whitespace on the directive line, and also says the directive is inert inside code blocks. In CommonMark a line indented by a tab (four columns) is an indented code block. The expectation lets the code rule win, as it does for four spaces after a blank line." });

// code — §10.1 inert inside code (#54)
c("code", "directive-in-code-span", "An own-line directive wrapped in a code span is inert", {
  md: "`![[" + LF + "]]`", items: [LF], html: P(CODE(`![[${LF}]]`)), literals: [`![[${LF}]]`], tr: [], spec: ["§10.1"], decisions: ["#54"] });
c("code", "directive-in-backtick-fence", "An own-line directive inside a backtick fence is inert", {
  md: "```\n![[" + LF + "]]\n```", items: [LF], html: PRE(`![[${LF}]]`), literals: [`![[${LF}]]`], tr: [], spec: ["§10.1"], decisions: ["#54"], seed: "tr_in_code_fence" });
c("code", "partial-in-tilde-fence", "A directive and its blockquote inside a tilde fence are inert", {
  md: "~~~md\n![[" + RA + "]]\n> Stigmergy is what a protocol looks like from inside\n~~~", items: [RA],
  html: PRE(`![[${RA}]]\n> Stigmergy is what a protocol looks like from inside`), literals: [`![[${RA}]]`], tr: [], spec: ["§10.1"], decisions: ["#54", "#49"] });
c("code", "directive-in-indented-code", "An own-line directive in an indented code block is inert", {
  md: `Para.\n\n    ![[${LF}]]\n\nAfter.`, items: [LF], html: P("Para.") + PRE(`![[${LF}]]`) + P("After."), literals: [`![[${LF}]]`], tr: [], spec: ["§10.1"], decisions: ["#54"] });
c("code", "link-in-code-span", "[[id]] inside a code span is inert and not disclosed", {
  kind: "fragment", md: "Code `[[" + LF + "]]` here.", items: [LF], html: P("Code ", CODE(`[[${LF}]]`), " here."), literals: [`[[${LF}]]`], links: [], spec: ["§10.1", "§10.3a"], decisions: ["#54", "#79"] });
c("code", "link-in-fence", "[[id]] inside a fenced block is inert and not disclosed", {
  kind: "fragment", md: "```\nsee [[" + LF + "]]\n```", items: [LF], html: PRE(`see [[${LF}]]`), literals: [`[[${LF}]]`], links: [], spec: ["§10.1", "§10.3a"], decisions: ["#54", "#79"] });
c("code", "link-in-indented-code", "[[id]] inside an indented code block is inert", {
  kind: "fragment", md: `Para.\n\n    see [[${LF}]]\n\nAfter.`, items: [LF], html: P("Para.") + PRE(`see [[${LF}]]`) + P("After."), literals: [`[[${LF}]]`], links: [], spec: ["§10.1"], decisions: ["#54"] });
c("code", "fence-then-real-directive", "A fenced example followed by the real directive: one quote", {
  md: "~~~md\n![[" + LF + "]]\n~~~\n\n![[" + LF + "]]", items: [LF], html: PRE(`![[${LF}]]`) + Q(LF), literals: [`![[${LF}]]`], tr: [TR(LF)], spec: ["§10.1"], decisions: ["#54"], seed: "tr_in_tilde_fence" });
c("code", "unclosed-fence-to-end", "An unclosed fence runs to the end of the document: nothing after it resolves, and the reserved form inside is not rejected", {
  md: "Intro.\n\n```\n![[" + LF + "]]\n\n![[" + LF + "@v2]]", items: [LF], html: P("Intro.") + PRE(`![[${LF}]]\n\n![[${LF}@v2]]`),
  literals: [`![[${LF}]]`, `![[${LF}@v2]]`], tr: [], spec: ["§10.1"], decisions: ["#54", "#9"], seed: "tr_in_unclosed_fence" });
c("code", "fence-in-blockquote", "A fence inside a blockquote is code: the directive in it is inert", {
  md: "> ```\n> ![[" + LF + "]]\n> ```\n\n![[" + LF + "]]", items: [LF], html: BQ(PRE(`![[${LF}]]`)) + Q(LF), literals: [`![[${LF}]]`], tr: [TR(LF)], spec: ["§10.1"], decisions: ["#54"], seed: "tr_in_quote_fence" });
c("code", "fence-in-list-item", "A fence inside a list item is code: the directive in it is inert", {
  md: "1. step\n   ```\n   ![[" + LF + "]]\n   ```\n2. next\n\n![[" + LF + "]]", items: [LF],
  html: `<ol>\n<li>step\n${PRE(`![[${LF}]]`)}</li>\n<li>next</li>\n</ol>\n` + Q(LF), literals: [`![[${LF}]]`], tr: [TR(LF)], spec: ["§10.1"], decisions: ["#54"], seed: "tr_in_list_fence" });
c("code", "unknown-ids-in-code-publish", "Unknown ids inside code are not resolved, so they are not publish errors", {
  md: "```\n[[" + UNKNOWN + "]]\n![[" + UNKNOWN + "]]\n```\n\n[[" + LF + "]]", items: [LF], html: PRE(`[[${UNKNOWN}]]\n![[${UNKNOWN}]]`) + P(L(LF)),
  literals: [`![[${UNKNOWN}]]`], tr: [], links: [LK(LF)], spec: ["§10.1", "§10.2"], decisions: ["#54"], seed: "link_code_thread" });

// label — §10.1 the author's label (#70), baked as data-blyg-label (#81)
c("label", "link-label", "A labelled link renders the label as its anchor text", {
  kind: "fragment", md: `See [[${LF} | the opening fragment]].`, items: [LF], html: P("See ", L(LF, "the opening fragment"), "."), links: [LK(LF)], spec: ["§10.1", "§10.3a"], decisions: ["#70", "#79"], seed: "label_link_forms" });
c("label", "link-label-tight", "No whitespace around the pipe", {
  kind: "fragment", md: `[[${LF}|tight]]`, items: [LF], html: P(L(LF, "tight")), links: [LK(LF)], spec: ["§10.1"], decisions: ["#70"] });
c("label", "link-label-trimmed", "Whitespace around the pipe and the label is trimmed", {
  kind: "fragment", md: `[[${LF}   |   padded label   ]]`, items: [LF], html: P(L(LF, "padded label")), links: [LK(LF)], spec: ["§10.1"], decisions: ["#70"] });
c("label", "link-label-with-pipe", "The label is everything after the first pipe, so it may contain a pipe", {
  kind: "fragment", md: `[[${LF} | a | b]]`, items: [LF], html: P(L(LF, "a | b")), links: [LK(LF)], spec: ["§10.1"], decisions: ["#70"] });
c("label", "link-label-empty", "An empty label is no label: the anchor text is the publisher's choice", {
  kind: "fragment", md: `See [[${LF} | ]] and [[${LF} |   ]].`, items: [LF], html: P("See ", L(LF), " and ", L(LF), "."), links: [LK(LF), LK(LF)], spec: ["§10.1"], decisions: ["#70"], seed: "label_link_empty_falls_back" });
c("label", "link-label-remote", "A labelled link to an imported item", {
  kind: "fragment", md: `[[${RA} | their post]] and [[${RB}|a line]]`, items: [RA, RB], html: P(L(RA, "their post"), " and ", L(RB, "a line")), links: [LK(RA), LK(RB)], spec: ["§10.1", "§10.3a"], decisions: ["#70", "#79"], seed: "label_link_remote" });
c("label", "link-label-text-escaped", "A label with & and quotes is text in the anchor", {
  kind: "fragment", md: `[[${LF} | Tom & "Jerry"]]`, items: [LF], html: P(L(LF, `Tom & "Jerry"`)), links: [LK(LF)], spec: ["§10.1"], decisions: ["#70"], seed: "label_link_escaped" });
c("label", "link-label-markup", "Markdown and HTML in a link label", {
  kind: "fragment", md: `[[${LF} | *not emphasis*]] and [[${LF} | a <b>bold</b> word]]`, items: [LF],
  html: P(L(LF, "*not emphasis*"), " and ", L(LF, "a <b>bold</b> word")), links: [LK(LF), LK(LF)], spec: ["§10.1"], decisions: ["#70"], seed: "label_link_markup",
  ambiguous_checks: ["normative"], ambiguous: "§10.1 says the label is 'everything after that pipe up to ]]' and is the anchor text, and §10.2 bakes a directive's label 'verbatim and HTML-escaped'. It does not say whether markdown or HTML inside a link label is rendered. The expectation takes the label as literal text (the author's words, escaped), which matches the directive rule." });
c("label", "link-label-ends-at-first-close", "A label ends at the first ]]: the rest of the line is literal", {
  kind: "fragment", md: `[[${LF} | cut]] here]]`, items: [LF], html: P(L(LF, "cut"), " here]]"), literals: ["here]]"], links: [LK(LF)], spec: ["§10.1"], decisions: ["#70"], seed: "label_link_cut_and_several" });
c("label", "directive-label-ends-at-first-close", "A directive whose label would contain ]] is not alone on its line: inert", {
  md: `![[${LF} | a]] b]]`, items: [LF], html: P(t(`![[${LF} | a]] b]]`)), literals: [`![[${LF} | a]] b]]`], tr: [], links: [], spec: ["§10.1"], decisions: ["#70"], seed: "label_directive_malformed" });
c("label", "label-first-literal", "The label before the id is not the grammar: literal text", {
  kind: "fragment", md: `[[a label | ${LF}]]`, items: [LF], html: P(t(`[[a label | ${LF}]]`)), literals: [`[[a label | ${LF}]]`], links: [], spec: ["§10.1"], decisions: ["#70", "#71"], seed: "label_link_not_ids" });
c("label", "label-in-code", "A labelled link inside a code span is inert", {
  kind: "fragment", md: "Write `[[" + LF + " | a label]]` to label a link.", items: [LF], html: P("Write ", CODE(`[[${LF} | a label]]`), " to label a link."),
  literals: [`[[${LF} | a label]]`], links: [], spec: ["§10.1"], decisions: ["#70", "#54"], seed: "label_link_in_code" });
c("label", "link-label-unresolvable", "A labelled link to an unknown id is a publish error, as an unlabelled one is", {
  kind: "fragment", md: `bad [[${UNKNOWN} | a label]]`, items: [], error: true, spec: ["§10.1"], decisions: ["#70"], seed: "label_link_unresolved" });
c("label", "directive-label", "A labelled directive bakes data-blyg-label; the label reaches nothing else", {
  md: `Intro.\n\n![[${LF} | note to self]]\n\nOutro.`, items: [LF], html: P("Intro.") + Q(LF, { label: "note to self" }) + P("Outro."), tr: [TR(LF)],
  spec: ["§10.1", "§10.2", "§10.3"], decisions: ["#70", "#81"], seed: "label_directive_quote" });
c("label", "directive-label-remote", "A labelled directive naming an imported item", {
  md: `From a friend:\n![[${RA} | a friend's line]]\nThat is all.`, items: [RA], html: P("From a friend:") + Q(RA, { label: "a friend's line" }) + P("That is all."), tr: [TR(RA)],
  spec: ["§10.1", "§10.2"], decisions: ["#70", "#81"], seed: "label_directive_remote" });
c("label", "directive-label-escaped", "data-blyg-label is the label verbatim and HTML-escaped", {
  md: `![[${LF} | Tom & "Jerry" <b>x</b>]]`, items: [LF], html: Q(LF, { label: `Tom & "Jerry" <b>x</b>` }), tr: [TR(LF)], spec: ["§10.2"], decisions: ["#81"] });
c("label", "directive-label-empty", "An empty label on a directive is no label: no data-blyg-label", {
  md: `![[${LF} |]]\n\n![[${LF}   |   ]]`, items: [LF], html: Q(LF) + Q(LF), tr: [TR(LF), TR(LF)], spec: ["§10.1", "§10.2"], decisions: ["#70", "#81"], seed: "label_directive_forms" });
c("label", "directive-label-pipe", "A directive label may contain a pipe", {
  md: `![[${LF} | a | b]]`, items: [LF], html: Q(LF, { label: "a | b" }), tr: [TR(LF)], spec: ["§10.1"], decisions: ["#70"] });
c("label", "directive-label-partial", "A labelled partial transclusion", {
  md: `![[${LF} | the tools line]]\n> Small tools, used daily\n\nMy reply.`, items: [LF],
  html: QP(LF, ["Small tools, used daily"], { label: "the tools line" }) + P("My reply."), tr: [TR(LF, { exact: "Small tools, used daily" })],
  spec: ["§10.1", "§10.2", "§10.3"], decisions: ["#70", "#81", "#49"], seed: "label_directive_partial" });
c("label", "directive-label-inline-inert", "A labelled directive not alone on its line is inert", {
  md: `text ![[${LF} | inline]] text`, items: [LF], html: P(t(`text ![[${LF} | inline]] text`)), literals: [`![[${LF} | inline]]`], tr: [], links: [], spec: ["§10.1"], decisions: ["#70"], seed: "label_directive_malformed" });
c("label", "directive-label-unresolvable", "A labelled directive naming an unknown id is a publish error", {
  md: `![[${UNKNOWN} | missing]]`, items: [], error: true, spec: ["§10.2"], decisions: ["#70"], seed: "label_directive_unresolved" });

// partial — §10.1–§10.3 partial transclusion (#49, #76)
c("partial", "partial-local", "A directive with an attached blockquote is a partial transclusion", {
  md: `Intro.\n\n![[${LF}]]\n> used daily, beat big tools\n\nMine.`, items: [LF], html: P("Intro.") + QP(LF, ["used daily, beat big tools"]) + P("Mine."),
  tr: [TR(LF, { exact: "used daily, beat big tools" })], spec: ["§10.1", "§10.2", "§10.3"], clauses: ["C-10.2-02", "C-10.3-01"], decisions: ["#49"], seed: "tr_partial_found" });
c("partial", "partial-remote", "A partial transclusion of an imported item carries data-blyg-origin and a selector", {
  md: `![[${RA}]]\n> Stigmergy is what a protocol looks like from inside\n\nCommentary.`, items: [RA],
  html: QP(RA, ["Stigmergy is what a protocol looks like from inside"]) + P("Commentary."), tr: [TR(RA, { exact: "Stigmergy is what a protocol looks like from inside" })],
  spec: ["§10.2", "§10.3"], clauses: ["C-10.2-02", "C-10.3-01"], decisions: ["#49"] });
c("partial", "partial-emphasis-dropped", "The selection is plain text: emphasis in the quote does not survive into the bake", {
  md: `![[${RA}]]\n> A second paragraph about *emphasis* and traces`, items: [RA],
  html: QP(RA, ["A second paragraph about emphasis and traces"]), tr: [TR(RA, { exact: "A second paragraph about emphasis and traces" })], spec: ["§10.2"], decisions: ["#49"], seed: "tr_partial_emphasis" });
c("partial", "partial-two-paragraphs", "A selection spanning two paragraphs: one <p> per line, the block boundary kept as a line break", {
  md: `![[${RA}]]\n> Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.\n>\n> A second paragraph about *emphasis* and traces`, items: [RA],
  html: QP(RA, ["Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.", "A second paragraph about emphasis and traces"]),
  tr: [TR(RA, { exact: "Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.\nA second paragraph about emphasis and traces" })],
  spec: ["§10.2", "§10.3", "§2"], decisions: ["#49"], seed: "tr_partial_paragraphs" });
c("partial", "partial-detached", "A blank line detaches the blockquote: a whole transclusion, then the author's own quotation", {
  md: `![[${RA}]]\n\n> My own quotation, not theirs.\n\nCommentary.`, items: [RA], html: Q(RA) + BQ(P("My own quotation, not theirs.")) + P("Commentary."), tr: [TR(RA)],
  spec: ["§10.1"], decisions: ["#49"], seed: "tr_partial_detached" });
c("partial", "partial-not-in-target", "A selection that is not a substring of the target's text content is a publish error", {
  md: `![[${LF}]]\n> big tools used daily\n\nAfter.`, items: [LF], error: true, spec: ["§10.2"], clauses: ["C-10.2-02"], decisions: ["#49"], seed: "tr_partial_not_found" });
c("partial", "partial-lazy-continuation", "The blockquote's extent is CommonMark's: a lazy continuation line belongs to the selection", {
  md: `![[${RA}]]\n> Stigmergy is what a protocol\nlooks like from inside\n\nCommentary.`, items: [RA],
  html: QP(RA, ["Stigmergy is what a protocol looks like from inside"]) + P("Commentary."), tr: [TR(RA, { exact: "Stigmergy is what a protocol looks like from inside" })],
  spec: ["§10.1", "§10.2"], decisions: ["#76", "#49"], seed: "tr_partial_lazy_marker" });
c("partial", "partial-escaped", "The selection is escaped plain text in the bake", {
  md: `![[${LN}]]\n> Notebooks & pencils`, items: [LN], html: QP(LN, ["Notebooks & pencils"]), tr: [TR(LN, { exact: "Notebooks & pencils" })], spec: ["§10.2"], decisions: ["#49"] });
c("partial", "partial-devanagari", "A Unicode (Devanagari) selection", {
  md: `![[${RB}]]\n> धर्म और कर्म — यह माध्यम ही संदेश है।`, items: [RB], html: QP(RB, ["धर्म और कर्म — यह माध्यम ही संदेश है।"]),
  tr: [TR(RB, { exact: "धर्म और कर्म — यह माध्यम ही संदेश है।" })], spec: ["§10.2"], decisions: ["#49"] });
c("partial", "partial-then-whole", "A partial transclusion followed by a whole one", {
  md: `![[${LF}]]\n> Small tools\n\n![[${RA}]]`, items: [LF, RA], html: QP(LF, ["Small tools"]) + Q(RA), tr: [TR(LF, { exact: "Small tools" }), TR(RA)], spec: ["§10.2", "§10.3"], decisions: ["#49"], seed: "tr_partial_then_whole" });
c("partial", "partial-of-thread-reaches-its-quote", "A thread's text content includes the words it baked, so a selection may come from them", {
  md: `![[${LT}]]\n> Small tools, used daily`, items: [LT], html: QP(LT, ["Small tools, used daily"]), tr: [TR(LT, { exact: "Small tools, used daily" })], spec: ["§10.2", "§2"], decisions: ["#49"], seed: "tr_partial_nested_text" });

// resolution — §10.2 order and errors
c("resolution", "unknown-id", "An unresolvable directive is a publish error", {
  md: `Before.\n\n![[${UNKNOWN}]]\n\nAfter.`, items: [], error: true, spec: ["§10.2"], clauses: ["C-10.2-01"], decisions: ["#26"], seed: "tr_unknown" });
c("resolution", "draft-target", "A draft is a publish error", {
  md: `![[${LD}]]`, items: [LD], error: true, spec: ["§10.2"], clauses: ["C-10.2-01"], decisions: ["#26"], seed: "tr_draft" });
c("resolution", "local-withdrawn-target", "A withdrawn local item with nothing retained is a publish error", {
  md: `![[${LG}]]`, items: [LG], error: true, spec: ["§10.2"], clauses: ["C-10.2-01"], decisions: ["#8"], seed: "tr_withdrawn" });
c("resolution", "remote-withdrawn-unretained", "An imported item withdrawn at its origin, with no pin, is a publish error", {
  md: `![[${RX}]]`, items: [RX], error: true, spec: ["§10.2", "§13.4"], clauses: ["C-10.2-01"], decisions: ["#8", "#26"], seed: "tr_source_withdrawn" });
c("resolution", "remote-withdrawn-pin-retained", "An imported item withdrawn at its origin but pin-retained resolves to the retained snapshot", {
  md: `![[${RW}]]`, items: [RW], html: Q(RW), tr: [TR(RW)], spec: ["§10.2", "§13.4"], clauses: ["C-10.2-01"], decisions: ["#8", "#26"],
  ambiguous: "Retention is a MAY (§13.4: a pinned version MAY be retained), so a reader that kept no copy of the pin after the withdrawal is conformant and publish-errors here; the fixture states that this renderer holds the retained snapshot. Separately, §10.2 does not say which version number a bake of a retained snapshot carries: the expectation bakes the retained version (1), whose bytes are quoted, not the withdrawal endcap (2)." });
c("resolution", "ambiguous-imported-id", "The same id imported from two origins is a publish error, never a guess", {
  md: `![[${RM}]]`, items: [RM + "@1", RM + "@2"], error: true, spec: ["§10.2", "§5.1"], clauses: ["C-10.2-01"], decisions: ["#17", "#26"], seed: "tr_ambiguous" });
c("resolution", "closure-contains-self", "A thread may not transclude a local thread whose local closure contains the publishing thread", {
  md: `Quoting the loop:\n\n![[${LLOOP}]]`, items: [LLOOP], self_prior: "First version of this thread.", error: true, spec: ["§10.2"], clauses: ["C-10.2-04"], decisions: ["#26", "#76"], seed: "tr_self" });
c("resolution", "link-unknown", "An unresolvable [[id]] link is a publish error", {
  kind: "fragment", md: `See [[${UNKNOWN}]].`, items: [], error: true, spec: ["§10.1"], decisions: ["#79"], seed: "link_unresolved_fragment" });
c("resolution", "link-draft", "A link to a draft is a publish error", {
  kind: "fragment", md: `See [[${LD}]].`, items: [LD], error: true, spec: ["§10.1", "§10.2"], decisions: ["#79"], seed: "link_unresolved_fragment" });
c("resolution", "link-local-withdrawn", "A link to a withdrawn local item with nothing retained is a publish error", {
  kind: "fragment", md: `See [[${LG}]].`, items: [LG], error: true, spec: ["§10.1", "§10.2"], decisions: ["#79"], seed: "link_unresolved_fragment" });
c("resolution", "link-ambiguous", "A link to an id held from two origins is a publish error", {
  kind: "fragment", md: `See [[${RM}]].`, items: [RM + "@1", RM + "@2"], error: true, spec: ["§10.1", "§10.2"], decisions: ["#79"], seed: "link_unresolved_fragment" });
c("resolution", "local-nested-thread", "Transcluding a local thread nests its baked quote; provenance is direct only", {
  md: `![[${LT}]]`, items: [LT], html: Q(LT), tr: [TR(LT)], spec: ["§10.2", "§10.3"], decisions: ["#26"], seed: "tr_found_local_thread" });
c("resolution", "remote-nested-thread", "Transcluding an imported thread nests its baked partial quote verbatim; its link is not this item's link", {
  md: `![[${RC}]]`, items: [RC], html: Q(RC), tr: [TR(RC)], links: [], spec: ["§10.2", "§10.3", "§10.3a"], decisions: ["#26", "#79"] });

// urls — §5.2 content_html is self-contained (#53), §5.8 page
c("urls", "link-local-page", "[[id]] renders as an anchor to the absolute URL of the target's page", {
  kind: "fragment", md: `See [[${LF}]] for context.`, items: [LF], html: P("See ", L(LF), " for context."), links: [LK(LF)], spec: ["§10.1", "§5.2", "§5.8"], clauses: ["C-5.2-03"], decisions: ["#53", "#79"], seed: "link_fragment_own" });
c("urls", "link-local-thread-page", "A link to a local thread uses the thread's page", {
  kind: "fragment", md: `See [[${LT}]].`, items: [LT], html: P("See ", L(LT), "."), links: [LK(LT)], spec: ["§10.1", "§5.8"], clauses: ["C-5.2-03"], decisions: ["#53"] });
c("urls", "link-remote-page", "A link to an imported item resolves its relative page against the item's origin", {
  kind: "fragment", md: `[[${RA}]]`, items: [RA], html: P(L(RA)), links: [LK(RA)], spec: ["§10.1", "§5.8"], clauses: ["C-5.2-03"], decisions: ["#53", "#79"], seed: "link_imported_page" });
c("urls", "link-remote-absolute-page", "A link to an imported item whose page is absolute uses it as given", {
  kind: "fragment", md: `[[${RP}]]`, items: [RP], html: P(L(RP)), links: [LK(RP)], spec: ["§10.1", "§5.8"], clauses: ["C-5.2-03"], decisions: ["#53"], seed: "link_imported_absolute_page" });
c("urls", "link-remote-no-page", "A link to an imported item whose document names no page", {
  kind: "fragment", md: `[[${RN}]]`, items: [RN], html: P(`<a href="${R1}f/${RN}/" data-x-presentation-text>…</a>`), links: [LK(RN)],
  anyHref: { [`${R1}f/${RN}/`]: [`${R1}f/${RN}/`, `${R1}items/${RN}.json`] }, spec: ["§10.1", "§5.8"], clauses: ["C-5.8-02"], decisions: ["#53", "#85"],
  ambiguous_checks: ["normative"], ambiguous: "§10.1 says the anchor's href is the absolute URL of the target's page (§5.8), and §5.8 lets readers fall back to the reference convention when `page` is absent. Decision #85 says a mention sender in the same position names the item document instead. The expectation accepts either the convention page or the item document." });
c("urls", "markdown-relative-links", "Relative markdown links are made absolute in content_html", {
  kind: "fragment", md: "[the archive](/archive/) and [notes](notes/x)", items: [], html: P(A(SELF_ORIGIN + "archive/", "the archive", true), " and ", A(SELF_ORIGIN + "notes/x", "notes", true)),
  spec: ["§5.2"], clauses: ["C-5.2-03"], decisions: ["#53"], seed: "links_inline",
  ambiguous_checks: ["normative"], ambiguous: "§5.2 requires every URL in content_html to be absolute but does not say what a relative URL the author wrote resolves against (the origin, the item's page, the mount). Only absoluteness is checked." });
c("urls", "markdown-relative-image", "A relative image source is made absolute in content_html", {
  kind: "fragment", md: "![a diagram](media/x7f2.png)", items: [], html: P(`<img src="${SELF_ORIGIN}media/x7f2.png" alt="a diagram">`),
  spec: ["§5.2", "§5.4"], clauses: ["C-5.2-03"], decisions: ["#53"], seed: "tr_sanitize_markdown" });
c("urls", "baked-remote-markup", "A baked quote carries the source's own HTML verbatim, its links included, with no link added", {
  md: `![[${RH}]]`, items: [RH], html: Q(RH), tr: [TR(RH)], links: [], spec: ["§10.2", "§5.2"], decisions: ["#26", "#53"] });
c("urls", "baked-remote-relative-url", "A relative URL in an imported item's HTML must not reach this item's content_html relative", {
  md: `![[${RR}]]`, items: [RR], html: bq(RR, 1, `<p>See <a href="${R1}notes/" data-x-absolute-only>the notes</a> for more.</p>\n`, { origin: R1 }), tr: [TR(RR)],
  spec: ["§5.2", "§10.2"], clauses: ["C-5.2-03", "C-5.2-04"], decisions: ["#53"],
  ambiguous_checks: ["normative","absolute-urls"], ambiguous: "The source is non-conformant (§5.2 requires its own content_html to be absolute). §10.2 bakes the held HTML, §5.2 says readers MAY resolve relative URLs on import, and §5.2 also says this item's content_html MUST be absolute. The expectation follows the MUST: whoever resolves it, the URL that reaches the bake is absolute." });

// disclosure — §10.3 transclusions[], §10.3a links[]
c("disclosure", "transclusions-order-and-origin", "transclusions[] is in directive order; origin is omitted for own-origin sources and present for remote ones", {
  md: `![[${RA}]]\n\n![[${LF}]]\n\n> plain quote\n\n![[${RB}]]`, items: [RA, LF, RB], html: Q(RA) + Q(LF) + BQ(P("plain quote")) + Q(RB), tr: [TR(RA), TR(LF), TR(RB)],
  spec: ["§10.3"], clauses: ["C-10.3-03"], decisions: ["#26", "#76"], seed: "tr_provenance_order" });
c("disclosure", "thread-without-directives", "A thread with no directives still carries transclusions: []", {
  md: "A thread with *no* quotes.", items: [], html: P("A thread with <em>no</em> quotes."), tr: [], spec: ["§10.3"], decisions: ["#26"], seed: "tr_plain_thread" });
c("disclosure", "links-in-fragment", "A fragment's [[id]] links are disclosed in links[], in document order, origin only for remote targets", {
  kind: "fragment", md: `See [[${LF}]] and [[${RA}]].`, items: [LF, RA], html: P("See ", L(LF), " and ", L(RA), "."), links: [LK(LF), LK(RA)], spec: ["§10.3a"], decisions: ["#79"] });
c("disclosure", "links-one-per-link", "One links[] entry per link: a target linked twice appears twice", {
  kind: "fragment", md: `[[${RA}]], then [[${LF}]], then [[${RA}]] again.`, items: [RA, LF], html: P(L(RA), ", then ", L(LF), ", then ", L(RA), " again."), links: [LK(RA), LK(LF), LK(RA)], spec: ["§10.3a"], decisions: ["#79"] });
c("disclosure", "markdown-link-is-silent", "A markdown link to a blyg page renders the same anchor and is not disclosed", {
  kind: "fragment", md: `[their post](${R1}f/${RA}/)`, items: [RA], html: P(A(`${R1}f/${RA}/`, "their post")), links: [], spec: ["§10.1", "§10.3a"], decisions: ["#79"] });
c("disclosure", "quote-and-link-same-target", "Quoting and linking one target: one transclusions[] entry and one links[] entry", {
  md: `![[${LF}]]\n\nSee also [[${LF}]].`, items: [LF], html: Q(LF) + P("See also ", L(LF), "."), tr: [TR(LF)], links: [LK(LF)], spec: ["§10.3", "§10.3a"], decisions: ["#79"] });

// generation — §5.7 blyg-tk-gen; inputs use the reference client's TK notation (decision #20)
c("generation", "tk-inline", "An inline generated span is wrapped in span.blyg-tk-gen", {
  kind: "fragment", md: "The weather was [TK]describe the weather[=]grey and still[/TK] that morning.", items: [],
  html: P("The weather was ", GS("grey and still"), " that morning."), gen: [GEN()], spec: ["§5.7"], clauses: ["C-5.7-07"], decisions: ["#20"], seed: "tk_inline_generated" });
c("generation", "tk-block", "A block generated span is wrapped in div.blyg-tk-gen", {
  kind: "fragment", md: "Intro paragraph.\n\n[TK]write two short paragraphs[=]First generated paragraph.\n\nSecond generated paragraph.[/TK]\n\nOutro.", items: [],
  html: P("Intro paragraph.") + GD(P("First generated paragraph.") + P("Second generated paragraph.")) + P("Outro."), gen: [GEN()], spec: ["§5.7"], clauses: ["C-5.7-07"], decisions: ["#20"], seed: "tk_block_generated" });
c("generation", "tk-local-source", "A generation source is disclosed in generated[].sources and never produces a transclusion", {
  md: `[TK]Summarise ![[${LF}]][=]Tools that are used daily win.[/TK]`, items: [LF], html: GD(P("Tools that are used daily win.")), tr: [], gen: [GEN(LF)],
  spec: ["§5.7", "§10.3"], decisions: ["#20"], seed: "tr_in_tk_inline" });
c("generation", "tk-remote-source", "A remote generation source carries its origin (new in 0.4)", {
  md: `[TK]Summarise ![[${RA}]][=]Protocols look like nothing from inside.[/TK]`, items: [RA], html: GD(P("Protocols look like nothing from inside.")), tr: [], gen: [GEN(RA)],
  spec: ["§5.7"], decisions: ["#44"] });
c("generation", "tk-labelled-source", "A label on a source directive reaches nothing on the wire", {
  md: `[TK]Summarise ![[${LF} | their post]] briefly[=]Done.[/TK]`, items: [LF], html: GD(P("Done.")), tr: [], gen: [GEN(LF)], spec: ["§5.7", "§10.1"], decisions: ["#20", "#70"], seed: "label_tk_source" });
c("generation", "tk-beside-transclusion", "A transclusion and a generated span in one thread: one quote, one source", {
  md: `![[${RA}]]\n\n[TK]Summarise ![[${LF}]][=]A bridge.[/TK]`, items: [RA, LF], html: Q(RA) + GD(P("A bridge.")), tr: [TR(RA)], gen: [GEN(LF)], spec: ["§5.7", "§10.3"], decisions: ["#20"], seed: "tr_with_tk_block_between" });
c("generation", "tk-in-code-not-a-scope", "[TK] inside code is an example of the notation, not a scope", {
  md: "`[TK]x[=]y[/TK]`\n\n![[" + LF + "]]", items: [LF], html: P(CODE("[TK]x[=]y[/TK]")) + Q(LF), literals: ["[TK]x[=]y[/TK]"], tr: [TR(LF)], gen: [], spec: ["§5.7", "§10.1"], decisions: ["#20", "#54"], seed: "tk_in_code_span" });
c("generation", "tk-link-inside-span", "A [[id]] link inside generated text is an anchor inside the wrapper, and is disclosed", {
  kind: "fragment", md: `a [TK]x[=]see [[${LF} | the fragment]][/TK] b`, items: [LF], html: P("a ", GS("see " + L(LF, "the fragment")), " b"), links: [LK(LF)], gen: [GEN()], spec: ["§5.7", "§10.1", "§10.3a"], decisions: ["#20", "#79"], seed: "link_in_tk" });
c("generation", "tk-several-spans", "Each generated span is wrapped, and generated[] has one entry per span in order", {
  kind: "fragment", md: "One [TK]a[=]alpha[/TK], two [TK]c[=]gamma[/TK].", items: [], html: P("One ", GS("alpha"), ", two ", GS("gamma"), "."), gen: [GEN(), GEN()], spec: ["§5.7"], decisions: ["#20"], seed: "tk_multiple" });
c("generation", "tk-markup-inside-span", "Markdown inside an inline generated span renders inside the wrapper", {
  kind: "fragment", md: "Price [TK]p[=]*five* dollars[/TK] end.", items: [], html: P("Price ", GS("<em>five</em> dollars"), " end."), gen: [GEN()], spec: ["§5.7"], decisions: ["#20"] });
c("generation", "tk-output-own-line-directive", "An own-line directive in generated output transcludes at publish (#60)", {
  md: `Intro.\n\n[TK]write it[=]Mine.\n\n![[${LF}]][/TK]\n\nOutro.`, items: [LF], html: P("Intro.") + GD(P("Mine.") + Q(LF)) + P("Outro."), tr: [TR(LF)], gen: [GEN()],
  spec: ["§5.7", "§10.1"], decisions: ["#60", "#20"], seed: "tr_block_tk_directive_split",
  ambiguous_checks: ["normative"], ambiguous: "Decision #60 makes the directive a real transclusion, so the quote and its transclusions[] entry are normative. Where the quote sits relative to the div.blyg-tk-gen is not stated; the expectation nests it inside the generated block, where the author's output put it, though a quote is not generated words." });
c("generation", "tk-ungenerated-scope", "A scope with no output is a publish error", {
  kind: "fragment", md: "Before [TK]summarise the argument[/TK] after.", items: [], error: true, spec: ["§5.7"], decisions: ["#20"], seed: "tk_ungenerated_inline" });

// ── Write ───────────────────────────────────────────────────────────────────
const strip = (html) => html.replace(/ data-x-[a-z-]+/g, "");
for (const f of readdirSync(here).filter((f) => f.endsWith(".json"))) unlinkSync(join(here, f));
const seen = new Set();
cases.forEach((k, i) => {
  if (seen.has(k.id)) throw new Error(`duplicate case id ${k.id}`);
  seen.add(k.id);
  const items = (k.items || []).map((key) => {
    const it = WORLD[key];
    if (!it) throw new Error(`${k.id}: unknown item ${key}`);
    return JSON.parse(JSON.stringify(it));
  });
  const expect = { error: k.error ?? false };
  if (k.error !== true) {
    expect.content_html = strip(k.html);
    expect.normative = project(k.html);
    if (k.anyHref) {
      const fix = (nodes) => nodes.forEach((n) => { if (n.a && k.anyHref[n.a]) n.a = k.anyHref[n.a]; if (n.children) fix(n.children); });
      fix(expect.normative);
    }
    if (k.literals) expect.literals = k.literals;
    if (k.tr) expect.transclusions = k.tr;
    if (k.links) expect.links = k.links;
    if (k.gen) expect.generated = k.gen;
  }
  const fixture = {
    id: k.id, title: k.title, group: k.group, ...SNAPSHOT,
    spec_refs: k.spec, clauses: k.clauses || [], decisions: k.decisions || [],
    kind: k.kind || "thread",
    self: { id: SELF, origin: SELF_ORIGIN, ...(k.self_prior ? { prior_content_md: k.self_prior } : {}) },
    content_md: k.md, items, expect,
  };
  if (k.group === "generation") fixture.notation = "reference-tk";
  if (k.ambiguous) fixture.ambiguous = k.ambiguous;
  if (k.ambiguous_checks) fixture.ambiguous_checks = k.ambiguous_checks;
  if (k.seed) fixture.seeded_from = k.seed;
  writeFileSync(join(here, `${String(i + 1).padStart(3, "0")}-${k.id}.json`), JSON.stringify(fixture, null, 2) + "\n");
});
console.log(`wrote ${cases.length} reader fixtures`);
