// Compare one renderer result against one fixture's expectation.
//
// Only the normative parts are compared (see lib/html.mjs). Each comparison
// yields named sub-checks; the case passes when every sub-check passes. A
// failing case whose fixture is marked `ambiguous` is reported as a warning:
// the expectation there is one reading of the text, not the text.
import { classifyUrl, project, textContent, parse, urls } from "./html.mjs";

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const KNOWN_DATA = ["data-blyg-id", "data-blyg-version", "data-blyg-origin", "data-blyg-label"];

function describe(n) {
  if (n.a !== undefined) return `<a href="${Array.isArray(n.a) ? n.a.join(" | ") : n.a}">`;
  return `<${n.wrapper} class="${n.classes.join(" ")}"${Object.entries(n.data).map(([k, v]) => ` ${k}="${v}"`).join("")}>`;
}

/** Compare two projected node lists. Returns { ok, problems: [string], notes: [string] }. */
export function compareNodes(exp, act, path = "") {
  const problems = [], notes = [];
  const n = Math.max(exp.length, act.length);
  for (let i = 0; i < n; i++) {
    const e = exp[i], a = act[i];
    const at = `${path}/${i + 1}`;
    if (!e) { problems.push(`${at}: unexpected ${describe(a)}${a.text !== undefined ? ` "${a.text.slice(0, 80)}"` : ""}`); continue; }
    if (!a) { problems.push(`${at}: missing ${describe(e)}`); continue; }
    if ((e.a !== undefined) !== (a.a !== undefined)) { problems.push(`${at}: expected ${describe(e)}, got ${describe(a)}`); continue; }
    if (e.a !== undefined) {
      const hrefOk = Array.isArray(e.a) ? e.a.includes(a.a) : e.a === "(absolute)" ? classifyUrl(a.a) === "absolute" : e.a === a.a;
      if (!hrefOk) problems.push(`${at}: anchor href expected ${Array.isArray(e.a) ? "one of " + e.a.join(", ") : e.a}, got ${a.a}`);
      if (e.text !== undefined && norm(e.text) !== norm(a.text)) problems.push(`${at}: anchor text expected "${e.text}", got "${a.text}"`);
      continue;
    }
    if (e.wrapper !== a.wrapper) problems.push(`${at}: wrapper element expected <${e.wrapper}>, got <${a.wrapper}>`);
    const ec = [...e.classes].sort().join(" "), ac = [...a.classes].sort().join(" ");
    if (ec !== ac) problems.push(`${at}: wire classes expected "${ec}", got "${ac}"`);
    for (const k of KNOWN_DATA) {
      if (e.data[k] !== a.data[k]) {
        if (e.data[k] === undefined) problems.push(`${at}: ${k} must be absent, got "${a.data[k]}"`);
        else if (a.data[k] === undefined) problems.push(`${at}: ${k} missing (expected "${e.data[k]}")`);
        else problems.push(`${at}: ${k} expected "${e.data[k]}", got "${a.data[k]}"`);
      }
    }
    for (const k of Object.keys(a.data)) if (!KNOWN_DATA.includes(k)) notes.push(`${at}: extra attribute ${k}="${a.data[k]}" (not compared)`);
    if (norm(e.text) !== norm(a.text)) problems.push(`${at}: wrapper text expected "${e.text.slice(0, 120)}", got "${(a.text || "").slice(0, 120)}"`);
    if (e.p) {
      const ap = a.p || [];
      if (e.p.length !== ap.length || e.p.some((x, j) => norm(x) !== norm(ap[j]))) problems.push(`${at}: partial bake expected <p> lines ${JSON.stringify(e.p)}, got ${JSON.stringify(ap)}`);
    }
    const sub = compareNodes(e.children || [], a.children || [], at);
    problems.push(...sub.problems); notes.push(...sub.notes);
  }
  return { ok: problems.length === 0, problems, notes };
}

function compareEntries(name, exp, act, keys) {
  if (exp === undefined) return null;
  if (act === undefined || act === null) return { name, status: "skip", detail: `${name}[] not reported by the renderer` };
  const problems = [];
  if (exp.length !== act.length) problems.push(`expected ${exp.length} entr${exp.length === 1 ? "y" : "ies"}, got ${act.length}`);
  for (let i = 0; i < Math.min(exp.length, act.length); i++) {
    const e = exp[i], a = act[i] || {};
    for (const k of keys(e, a)) {
      const ev = k === "selector.exact" ? e.selector?.exact : e[k];
      const av = k === "selector.exact" ? a.selector?.exact : a[k];
      if (ev === undefined && av !== undefined) problems.push(`[${i}].${k} must be absent, got ${JSON.stringify(av)}`);
      else if (ev !== undefined && String(ev) !== String(av)) problems.push(`[${i}].${k} expected ${JSON.stringify(ev)}, got ${JSON.stringify(av)}`);
    }
  }
  return { name, status: problems.length ? "fail" : "pass", detail: problems.join("; ") || `${act.length} entr${act.length === 1 ? "y" : "ies"} as expected` };
}

/** Compare one case. `result` is { error?, content_html?, transclusions?, links?, generated? }. */
export function compareCase(fx, result) {
  const checks = [];
  const exp = fx.expect;
  // The adapter could not drive the renderer: that is not a publish error.
  if (result.adapter_error) return { id: fx.id, status: "fail", checks: [{ name: "adapter", status: "fail", detail: String(result.error) }] };
  const gotError = result.error !== undefined && result.error !== null && result.error !== false;
  if (exp.error === true) checks.push({ name: "outcome", status: gotError ? "pass" : "fail", detail: gotError ? `publish error: ${String(result.error).slice(0, 160)}` : "expected a publish error; the renderer published" });
  else if (exp.error === false) checks.push({ name: "outcome", status: gotError ? "fail" : "pass", detail: gotError ? `unexpected publish error: ${String(result.error).slice(0, 200)}` : "published" });
  else checks.push({ name: "outcome", status: "pass", detail: gotError ? `publish error (accepted): ${String(result.error).slice(0, 160)}` : "published (accepted)" });

  if (!gotError && exp.error !== true) {
    const html = result.content_html ?? "";
    const actual = project(html);
    const cmp = compareNodes(exp.normative || [], actual);
    checks.push({ name: "normative", status: cmp.ok ? "pass" : "fail", detail: cmp.ok ? `${(exp.normative || []).length} normative node(s) match${cmp.notes.length ? "; " + cmp.notes.join("; ") : ""}` : cmp.problems.join("; "), actual });
    if (exp.literals) {
      const text = norm(textContent(parse(html)));
      const missing = exp.literals.filter((l) => !text.includes(norm(l)));
      checks.push({ name: "literals", status: missing.length ? "fail" : "pass", detail: missing.length ? `inert text missing from the output: ${missing.map((m) => JSON.stringify(m)).join(", ")}` : `${exp.literals.length} inert sequence(s) present as text` });
    }
    const found = urls(html).map((u) => ({ ...u, kind: classifyUrl(u.value) }));
    const rel = found.filter((u) => u.kind === "relative"), frag = found.filter((u) => u.kind === "fragment");
    checks.push({
      name: "absolute-urls", status: rel.length ? "fail" : frag.length ? "warn" : "pass",
      detail: rel.length ? `relative URL(s) in content_html: ${rel.map((u) => `${u.tag}[${u.attr}]="${u.value}"`).join(", ")}`
        : frag.length ? `fragment-only URL(s): ${frag.map((u) => u.value).join(", ")}` : `${found.length} URL(s), all absolute`,
    });
    const tr = compareEntries("transclusions", exp.transclusions, result.transclusions, (e) => ["id", "version", "origin", ...(e.selector ? ["selector.exact"] : [])]);
    if (tr) {
      // A selector the expectation does not carry must not appear either.
      if (tr.status === "pass" && exp.transclusions && result.transclusions) {
        const extra = result.transclusions.map((a, i) => (!exp.transclusions[i]?.selector && a?.selector ? i : -1)).filter((i) => i >= 0);
        if (extra.length) { tr.status = "fail"; tr.detail = `selector present on whole transclusion entr${extra.length > 1 ? "ies" : "y"} ${extra.join(", ")}`; }
      }
      checks.push(tr);
    }
    const lk = compareEntries("links", exp.links, result.links, (e, a) => [...new Set(["id", "origin", ...Object.keys(a)])]);
    if (lk) checks.push(lk);
    if (exp.generated !== undefined) {
      const act = result.generated;
      if (act === undefined || act === null) checks.push({ name: "generated", status: "skip", detail: "generated[] not reported by the renderer" });
      else {
        const problems = [];
        if (exp.generated.length !== act.length) problems.push(`expected ${exp.generated.length} entr${exp.generated.length === 1 ? "y" : "ies"}, got ${act.length}`);
        exp.generated.forEach((g, i) => {
          const s = act[i]?.sources;
          if (!s) return;
          const sub = compareEntries("sources", g.sources, s, () => ["id", "version", "origin"]);
          if (sub.status === "fail") problems.push(`[${i}].sources: ${sub.detail}`);
        });
        checks.push({ name: "generated", status: problems.length ? "fail" : "pass", detail: problems.join("; ") || `${act.length} generated span(s) disclosed as expected` });
      }
    }
  }

  // A fixture's `ambiguous_checks` names the sub-checks its ambiguity covers
  // (all of them when absent); a failure outside that list stays a failure.
  const failing = checks.filter((c) => c.status === "fail");
  const covered = fx.ambiguous && failing.every((c) => !fx.ambiguous_checks || fx.ambiguous_checks.includes(c.name));
  for (const c of failing) if (covered) c.status = "warn";
  // A case whose only gaps are arrays the renderer did not report is not a pass:
  // it is counted apart, so a renderer that omits links[] cannot outscore one
  // that emits a wrong one.
  const status = failing.length && !covered ? "fail" : checks.some((c) => c.status === "warn") ? "warn"
    : checks.some((c) => c.status === "skip") ? "unreported" : "pass";
  return { id: fx.id, status, checks };
}
