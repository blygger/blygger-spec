// Mutation self-test: take a known-good document, break exactly one MUST, and
// confirm the checker reports a failure. Proves the schema/rule layers bite.
import { validateDoc } from "./validate.mjs";
import { runRules } from "./semantic.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const fails = (doc, type = "item") => {
  const s = validateDoc(type, doc);
  const r = runRules(type, doc, {});
  return [...s.fail.map((e) => `schema ${e.path} ${e.message}`), ...r.filter((x) => x.level === "fail" && x.messages.length).map((x) => `${x.rule}: ${x.messages[0]}`)];
};

/** docs: {thread (with remote partial), stub (blyg target, quoting it), fragment, fork} */
export function selftest(docs) {
  const M = [];
  const m = (id, title, clauses, base, mut, type) => {
    if (!base) return;
    const d = clone(base);
    mut(d);
    const f = fails(d, type);
    M.push({ id, title, clauses, caught: f.length > 0, by: f.slice(0, 3) });
  };
  m("stub-origin-missing", "stub_of without origin", ["C-10.6-02", "C-5.9-01"], docs.stub, (d) => delete d.stub_of.origin);
  m("fork-origin-missing", "forked_from without origin", ["C-5.6-02", "C-5.9-01"], docs.fork, (d) => delete d.forked_from.origin);
  m("cited-no-retrieved", "cited without retrieved", ["C-5.9-04"], docs.fork, (d) => delete d.forked_from.cited.retrieved);
  m("reference-extra-member", "an extra member on a reference", ["C-5.9-02"], docs.stub, (d) => (d.stub_of.title = "x"));
  m("relative-url", "a relative href in content_html", ["C-5.2-03"], docs.fragment, (d) => (d.content_html += '<p><a href="f/x/">x</a></p>'));
  m("hash-wrong", "content_hash not sha256(content_md)", ["C-5.1-03"], docs.fragment, (d) => (d.content_md += " "));
  m("updated-mismatch", "updated ≠ last changelog at", ["C-5.2-02"], docs.fragment, (d) => (d.updated = "2020-01-01T00:00:00Z"));
  m("local-time", "a timestamp in local time", ["C-4-12"], docs.fragment, (d) => (d.created = "2026-10-01T10:00:00+02:00"));
  m("bad-id", "an id outside Crockford base32", ["C-5.1-01"], docs.fragment, (d) => (d.id = "ILOU" + d.id.slice(4)));
  m("stub-version-disagrees", "stub_of.version ≠ the version the body bakes", ["C-10.6-03"], docs.stub, (d) => (d.stub_of.version += 5));
  m("selector-dropped", "partial directive but selector dropped (the Blynger fork loss)", ["C-10.3-01", "C-10.2-02"], docs.thread, (d) => d.transclusions.forEach((t) => delete t.selector));
  m("partial-class-missing", "selector present but bake lacks blyg-partial", ["C-10.2-02"], docs.thread, (d) => (d.content_html = d.content_html.replace(/ blyg-partial/g, "")));
  m("instruction-leaked", "generated[] entry carrying instruction text", ["C-5.7-05"], docs.generated, (d) => (d.generated[0].instruction = "Summarise"));
  m("tk-on-wire", "TK grammar left in content_md", ["C-5.7-05"], docs.fragment, (d) => { d.content_md = "[TK]x[=]y[/TK]"; });
  m("endcap-with-content", "withdrawn endcap with content", [], docs.fragment, (d) => (d.kind = "withdrawn"));
  m("fragment-transclusions", "a fragment carrying transclusions", [], docs.fragment, (d) => (d.transclusions = []));
  m("changelog-gap", "changelog skips a version", [], docs.fragment, (d) => { d.changelog.push({ version: d.version + 2, at: d.updated }); d.version += 2; });
  m("page-host-rooted", "page host-rooted (/f/…)", ["C-5.8-01"], docs.fragment, (d) => (d.page = "/" + d.page));
  m("pinned-endcap", "a pinned file for a withdrawal endcap", ["C-8-03"], docs.pinned, (d) => (d.kind = "withdrawn"), "pinned");
  m("reserved-directive", "![[id@vN]] published", ["C-10.1-01"], docs.thread, (d) => (d.content_md += `\n\n![[${d.id}@v1]]`));
  return M;
}
