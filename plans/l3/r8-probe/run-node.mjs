// node run-node.mjs: seals a bundle, checks it and every other runtime's bundle in out/.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { checkBundle, checkCarry, makeBundle, measureSizes, measureTimes } from './scenario.mjs';

const dir = new URL('./out/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('bundle-node.json', dir), JSON.stringify(await makeBundle(`node ${process.version}`), null, 1));
const report = { runtime: `node ${process.version}`, opened: {} };
for (const f of readdirSync(dir).filter((f) => /^bundle-.*\.json$/.test(f))) {
  report.opened[f] = await checkBundle(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
}
report.carry = await checkCarry();
report.sizes = await measureSizes();
report.times = await measureTimes();
writeFileSync(new URL('report-node.json', dir), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ opened: report.opened, carry: report.carry, times: report.times }, null, 1));
