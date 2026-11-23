// node run-runtimes.mjs <dir with node_modules holding playwright and miniflare>
// Runs the scenario in Chromium and WebKit (Playwright) and in workerd (Miniflare): each seals
// a bundle and opens every bundle in out/, including the ones the others just made.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(join(process.argv[2], 'package.json'));
const { chromium, webkit } = require('playwright');
const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
const here = new URL('.', import.meta.url).pathname;
const out = join(here, 'out');
const src = (f) => readFileSync(join(here, f), 'utf8');
const bundles = () => Object.fromEntries(readdirSync(out).filter((f) => /^bundle-.*\.json$/.test(f)).map((f) => [f, JSON.parse(readFileSync(join(out, f), 'utf8'))]));

async function inBrowser(type, name) {
  const browser = await type.launch();
  const page = await browser.newPage();
  await page.route('https://probe.test/**', (route) => {
    const file = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (file === 'index.html') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>probe</title>' });
    route.fulfill({ contentType: 'text/javascript', body: src(file) });
  });
  await page.goto('https://probe.test/index.html');
  const result = await page.evaluate(async (others) => {
    const sc = await import('/scenario.mjs');
    const report = { runtime: navigator.userAgent, opened: {} };
    const own = await sc.makeBundle(navigator.userAgent);
    for (const [f, b] of Object.entries(others)) report.opened[f] = await sc.checkBundle(b);
    report.opened.self = await sc.checkBundle(own);
    report.carry = await sc.checkCarry();
    report.times = await sc.measureTimes();
    return { own, report };
  }, bundles());
  await browser.close();
  writeFileSync(join(out, `bundle-${name}.json`), JSON.stringify(result.own, null, 1));
  return result.report;
}

async function inWorker() {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: [
      { type: 'ESModule', path: 'worker.mjs', contents: `import * as sc from './scenario.mjs';
export default { async fetch(request) {
  const others = await request.json();
  const report = { runtime: 'workerd', opened: {} };
  const own = await sc.makeBundle('workerd (Miniflare)');
  for (const [f, b] of Object.entries(others)) report.opened[f] = await sc.checkBundle(b);
  report.opened.self = await sc.checkBundle(own);
  report.carry = await sc.checkCarry();
  report.times = await sc.measureTimes(50);
  return Response.json({ own, report });
} };` },
      { type: 'ESModule', path: 'scenario.mjs', contents: src('scenario.mjs') },
      { type: 'ESModule', path: 'seal.mjs', contents: src('seal.mjs') },
    ],
    compatibilityDate: '2026-07-01',
  }));
  const response = await mf.dispatchFetch('http://probe/', { method: 'POST', body: JSON.stringify(bundles()) });
  const result = await response.json();
  await mf.dispose();
  writeFileSync(join(out, 'bundle-workerd.json'), JSON.stringify(result.own, null, 1));
  return result.report;
}

const reports = { chromium: await inBrowser(chromium, 'chromium'), webkit: await inBrowser(webkit, 'webkit'), workerd: await inWorker() };
writeFileSync(join(out, 'report-runtimes.json'), JSON.stringify(reports, null, 1));
for (const [name, r] of Object.entries(reports)) {
  const fails = Object.entries(r.opened).flatMap(([f, checks]) => Object.entries(checks).filter(([, v]) => v !== 'pass').map(([c, v]) => `${f}: ${c}: ${v}`));
  console.log(`${name}: opened ${Object.keys(r.opened).join(', ')}; ${fails.length ? fails.join('; ') : 'all pass'}; carry ${Object.values(r.carry).join('/')}; times ${JSON.stringify(r.times)}`);
}
