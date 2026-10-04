// Source of the grammar fixture corpus. `node grammar/_source.mjs` rewrites
// grammar/*.json from this list (the JSON files are the corpus; this file is
// only the convenient way to author it). Ids: RA/RB/RC are items at the fake
// remote origin https://source.example/ (harness/fake-remote.mjs); {{L}} is a
// local published fragment, substituted at run time (TK sources must be
// local at 0.3, §5.7 rule 1).
import { writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RA, RB, RC } from "../harness/fake-remote.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SEL = "Stigmergy is what a protocol looks like from inside";
const none = { error: false, transclusions: [], links: [], tk_sources: [], literal: [] };
const W = (id) => ({ id, partial: false });
const P = (id, exact) => ({ id, partial: true, exact });

const cases = [
  ["whole-remote", "Own-line directive naming an imported item is a whole transclusion", ["§10.1", "§10.2"], ["#9", "#26"], `![[${RA}]]`, { transclusions: [W(RA)] }],
  ["whole-local", "Own-line directive naming a local fragment", ["§10.1", "§10.2"], ["#9"], `Intro.\n\n![[{{L}}]]\n\nOutro.`, { transclusions: [W("{{L}}")] }],
  ["whole-surrounding-whitespace", "Surrounding whitespace is allowed on the directive line", ["§10.1"], ["#9"], `   ![[${RA}]] \t`, { transclusions: [W(RA)] }],
  ["partial-attached", "Directive immediately followed by a blockquote is a partial transclusion", ["§10.1", "§10.2", "§10.3"], ["#49"], `![[${RA}]]\n> ${SEL}\n\nCommentary.`, { transclusions: [P(RA, SEL)] }],
  ["partial-detached-blank-line", "A blank line detaches the blockquote: whole transclusion + the author's own quotation", ["§10.1"], ["#49"], `![[${RA}]]\n\n> My own quotation, not theirs.\n\nCommentary.`, { transclusions: [W(RA)] }],
  ["partial-multiparagraph", "A selection spanning two paragraphs keeps the block boundary as a line break", ["§10.2"], ["#49"],
    `![[${RA}]]\n> Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.\n>\n> A second paragraph about *emphasis* and traces`,
    { transclusions: [P(RA, "Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.\nA second paragraph about emphasis and traces")] }],
  ["partial-not-in-target", "A selection that is not a substring of the target's text content is a publish error", ["§10.2"], ["#49"], `![[${RA}]]\n> words that are nowhere in the target`, { error: true }],
  ["partial-lazy-continuation", "A non-'>' line right after the quote run: CommonMark lazy continuation would extend the blockquote; implementations end the selection", ["§10.1"], ["#49"],
    `![[${RA}]]\n> ${SEL}\nlazy continuation line`, { transclusions: [P(RA, SEL)], ambiguous: "The spec says 'the blockquote's text is the selection'. In CommonMark the third line is a lazy continuation inside the blockquote; both implementations end the run at the first line not starting with '>'. Expectation encodes the implementations' reading." }],
  ["reserved-version", "![[id@vN]] is reserved: 0.3 publishers MUST reject it", ["§10.1"], ["#9"], `![[${RA}@v1]]`, { error: true }],
  ["unknown-id", "An unresolvable directive is a publish error", ["§10.2"], ["#26"], `![[zzzzzzzzzzzzzzzzzzzzzzzzzz]]`, { error: true }],
  ["inline-directive-inert", "A directive sequence that is not alone on its line is inert text (and not a link)", ["§10.1"], ["#9", "#32"], `Text ![[${RA}]] inline.`, { literal: [`![[${RA}]]`] }],
  ["link-inline", "[[id]] inline outside code is a plain internal link", ["§10.1"], ["#32"], `See [[${RA}]] here.`, { links: [RA] }],
  ["link-and-inline-directive", "On one line, ![[a]] is inert and [[b]] is a link", ["§10.1"], ["#32"], `![[${RA}]] and [[${RB}]]`, { links: [RB], literal: [`![[${RA}]]`] }],
  ["directive-then-link-line", "A directive followed by a [[id]] line: whole transclusion + link", ["§10.1"], ["#32", "#49"], `![[${RA}]]\n[[${RB}]]`, { transclusions: [W(RA)], links: [RB] }],
  ["multiple-directives", "Several directives, consecutive and separated, in order", ["§10.1", "§10.3"], ["#26"], `![[${RA}]]\n![[${RB}]]\n\n![[${RC}]]`, { transclusions: [W(RA), W(RB), W(RC)] }],
  ["link-in-code-span", "[[id]] inside a code span is inert", ["§10.1"], ["#54"], "Code `[[" + RA + "]]` here.", { literal: [`[[${RA}]]`] }],
  ["directive-in-code-span-own-line", "An own-line directive wrapped in a code span is inert", ["§10.1"], ["#54"], "`![[" + RA + "]]`", { literal: [`![[${RA}]]`] }],
  ["directive-in-fenced-code", "An own-line directive inside a backtick fence is inert", ["§10.1"], ["#54"], "```\n![[" + RA + "]]\n```", { literal: [`![[${RA}]]`] }],
  ["partial-in-tilde-fence", "Directive + quote inside a tilde fence is inert", ["§10.1"], ["#54", "#49"], "~~~md\n![[" + RA + "]]\n> " + SEL + "\n~~~", { literal: [`![[${RA}]]`] }],
  ["directive-in-indented-code", "An own-line directive in an indented code block is inert", ["§10.1"], ["#54"], `Para.\n\n    ![[${RA}]]\n\nAfter.`, { literal: [`![[${RA}]]`] }],
  ["link-in-fenced-code", "[[id]] inside a fenced block is inert", ["§10.1"], ["#54"], "```\nsee [[" + RA + "]]\n```", { literal: [`[[${RA}]]`] }],
  ["crlf-partial-and-link", "CRLF line endings: partial transclusion and link still recognized", ["§10.1"], ["#49", "#32"], `Intro.\r\n\r\n![[${RA}]]\r\n> ${SEL}\r\n\r\nSee [[${RB}]].\r\n`,
    { transclusions: [P(RA, SEL)], links: [RB], ambiguous: "The spec does not say how line endings are treated; 'surrounding whitespace allowed' covers a trailing \\r on the directive line only." }],
  ["devanagari-partial", "Unicode (Devanagari) selection and surrounding prose", ["§10.1", "§10.2"], ["#49"], `![[${RB}]]\n> धर्म और कर्म — यह माध्यम ही संदेश है।\n\nटिप्पणी: [[${RA}]]।`, { transclusions: [P(RB, "धर्म और कर्म — यह माध्यम ही संदेश है।")], links: [RA] }],
  ["tk-source-not-quote", "Inside a TK scope, ![[id]] is a generation source, never a transclusion", ["§5.7", "§10.1"], ["#20"], `[TK]Summarise ![[{{L}}]][=]Some output.[/TK]`, { tk_sources: [["{{L}}"]] }],
  ["tk-source-own-line", "An own-line directive inside a TK scope is still a source", ["§5.7"], ["#20"], `[TK]Draw on this\n![[{{L}}]]\n[=]Some output.[/TK]`, { tk_sources: [["{{L}}"]] }],
  ["tk-scope-beside-transclusion", "A TK scope and a real transclusion in one thread: one quote, one source", ["§5.7", "§10.3"], ["#20"], `![[${RA}]]\n\n[TK]Summarise ![[{{L}}]][=]Some output.[/TK]`, { transclusions: [W(RA)], tk_sources: [["{{L}}"]] }],
  ["tk-in-code-is-not-a-scope", "A [TK] written inside code is an example of the grammar, not a scope; the directive below it is real", ["§5.7", "§10.1"], ["#20", "#54"], "`[TK]x ![[" + RA + "]][/TK]`\n\n![[" + RB + "]]", { transclusions: [W(RB)], literal: ["[TK]"] }],
];

for (const f of readdirSync(here).filter((f) => f.endsWith(".json"))) unlinkSync(join(here, f));
cases.forEach(([id, title, spec_refs, decisions, content_md, exp], i) => {
  const { ambiguous, ...rest } = exp;
  const c = { id, title, spec_refs, decisions, content_md, expect: { ...none, ...rest } };
  if (ambiguous) c.ambiguous = ambiguous;
  writeFileSync(join(here, `${String(i + 1).padStart(2, "0")}-${id}.json`), JSON.stringify(c, null, 2) + "\n");
});
console.log(`wrote ${cases.length} grammar cases`);
