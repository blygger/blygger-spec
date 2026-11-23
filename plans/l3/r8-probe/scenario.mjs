// The probe's scenario, runnable anywhere seal.mjs runs. `makeBundle` seals a test item and
// returns it with the throwaway keys needed to open it; `checkBundle` opens a bundle made by
// any implementation (this one, Python, another runtime) and reports each check.
import * as s from './seal.mjs';

const ORIGIN = 'https://blyg.example.org/';
const HOME = 'https://keys.example.org/';
const ID = '5q1k8w3zc7n0d2v9h6m4r8t2xa';
const ID2 = '7c2m9q4x1z8w3n6v0k5r2t7bpa';
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));

export async function makeBundle(label) {
  const lockA = { lock: 'ka' + s.base32(s.random(10)), epoch: 2, home: HOME, key: s.random(32) };
  const lockB = { lock: 'kb' + s.base32(s.random(10)), epoch: 1, home: HOME, key: s.random(32) };
  const lockC = { lock: 'kc' + s.base32(s.random(10)), epoch: 1, home: HOME, key: s.random(32) };
  // Nested entry e2 lives inside e1's plaintext, under a narrower lock (AND).
  const inner = await s.sealEntry({ origin: ORIGIN, id: ID, entry: 'e2', plaintext: { content_md: 'at $41 a share', content_html: 'at $41 a share' }, description: 'a price', locks: [lockC] });
  const outerPlain = { content_md: 'Northwind Capital, [a price]', content_html: 'Northwind Capital, <span class="blyg-sealed" data-blyg-entry="e2">a price</span>', sealed: [inner.entry] };
  // e1 opens under A or B (OR).
  const outer = await s.sealEntry({ origin: ORIGIN, id: ID, entry: 'e1', plaintext: outerPlain, description: 'the acquirer', selector: { exact: 'the acquirer', prefix: 'offer from ', suffix: '. The board' }, locks: [lockA, lockB] });
  const item = {
    blyg: '0.5', id: ID, kind: 'thread', version: 4, origin: ORIGIN,
    content_md: 'There is an acquisition offer from the acquirer. The board meets on Friday.',
    content_html: '<p>There is an acquisition offer from <span class="blyg-sealed" data-blyg-entry="e1">the acquirer</span>. The board meets on Friday.</p>',
    sealed: [outer.entry],
  };
  // A whole-item seal: one block entry, cover as the body, `about` set.
  const whole = await s.sealEntry({ origin: ORIGIN, id: ID2, entry: 'e1', plaintext: { content_md: 'Minutes of the board, 2026-11-20. ' + 'Discussion. '.repeat(40), content_html: '<p>Minutes…</p>' }, description: 'Board minutes for November', about: 'Board minutes for November', locks: [lockA] });
  // A grant of lock A's key to a recipient origin, at the path both sides compute.
  const home = await s.x25519Pair(), recipient = await s.x25519Pair();
  const subject = s.subjectLock(lockA.lock, lockA.epoch);
  const sharedHome = await s.x25519(home.priv, home.pub, recipient.pub);
  const grant = await s.hpkeSeal(recipient.pub, lockA.key, s.grantInfo(subject));
  const requestUrl = `${HOME}l/${lockA.lock}`, at = '2026-11-22T20:00:00Z';
  return {
    label,
    item, whole: { id: ID2, entry: whole.entry, description: 'Board minutes for November' },
    keys: { A: { ...lockA, key: hex(lockA.key) }, B: { ...lockB, key: hex(lockB.key) }, C: { ...lockC, key: hex(lockC.key) } },
    grant: { home: { priv: hex(home.priv), pub: hex(home.pub) }, recipient: { priv: hex(recipient.priv), pub: hex(recipient.pub) }, subject, blob: s.b64u(grant), path: await s.grantPath(sharedHome, HOME, subject) },
    request: { url: requestUrl, at, mac: await s.requestMac(sharedHome, HOME, requestUrl, at) },
  };
}

const heldOf = (bundle, names) => Object.fromEntries(names.map((n) => [`${bundle.keys[n].lock}:${bundle.keys[n].epoch}`, unhex(bundle.keys[n].key)]));

export async function checkBundle(bundle) {
  const results = {};
  const ok = (name, pass, detail) => { results[name] = pass ? 'pass' : `FAIL${detail ? ': ' + detail : ''}`; };
  const e1 = bundle.item.sealed[0];
  const ctx = { origin: bundle.item.origin, id: bundle.item.id, description: 'the acquirer' };
  const viaA = await s.openEntry(e1, { ...ctx, held: heldOf(bundle, ['A']) });
  ok('open span via lock A', viaA.status === 'opened' && viaA.plaintext.content_md.startsWith('Northwind'), viaA.status);
  const viaB = await s.openEntry(e1, { ...ctx, held: heldOf(bundle, ['B']) });
  ok('open span via lock B (OR)', viaB.status === 'opened', viaB.status);
  ok('no key: cover only', (await s.openEntry(e1, { ...ctx, held: heldOf(bundle, ['C']) })).status === 'no key');
  const e2 = viaA.plaintext?.sealed?.[0];
  const nested = e2 && await s.openEntry(e2, { ...ctx, description: 'a price', held: heldOf(bundle, ['C']) });
  ok('open nested span via lock C (AND)', nested?.status === 'opened' && nested.plaintext.content_md === 'at $41 a share', nested?.status);
  ok('nested entry needs the outer key to be seen', !JSON.stringify(bundle.item).includes(e2?.ct ?? '\u0000'));
  ok('wrong description fails the commitment', (await s.openEntry(e1, { ...ctx, description: 'someone else', held: heldOf(bundle, ['A']) })).status === 'commitment mismatch');
  const transplanted = await s.openEntry(e1, { ...ctx, id: '0000000000000000000000000a', held: heldOf(bundle, ['A']) }).catch(() => ({ status: 'refused' }));
  ok('entry transplanted to another item does not open (AAD)', transplanted.status === 'refused');
  const w = bundle.whole;
  const wholeOpen = await s.openEntry(w.entry, { origin: bundle.item.origin, id: w.id, description: w.description, held: heldOf(bundle, ['A']) });
  ok('open whole-item seal', wholeOpen.status === 'opened', wholeOpen.status);
  // Grant: the recipient computes the same path from its side, and opens the HPKE blob.
  const g = bundle.grant;
  const sharedRecipient = await s.x25519(unhex(g.recipient.priv), unhex(g.recipient.pub), unhex(g.home.pub));
  ok('grant path agrees (recipient side)', (await s.grantPath(sharedRecipient, HOME, g.subject)) === g.path);
  const lockKey = await s.hpkeOpen(unhex(g.recipient.priv), unhex(g.recipient.pub), s.unb64u(g.blob), s.grantInfo(g.subject));
  ok('HPKE grant opens to lock A key', hex(lockKey) === bundle.keys.A.key);
  const wrongSubject = await s.hpkeOpen(unhex(g.recipient.priv), unhex(g.recipient.pub), s.unb64u(g.blob), s.grantInfo('lock:other:1')).then(() => 'opened', () => 'refused');
  ok('grant for one subject does not open as another', wrongSubject === 'refused');
  ok('request MAC agrees (recipient computes, home checks)', (await s.requestMac(sharedRecipient, HOME, bundle.request.url, bundle.request.at)) === bundle.request.mac);
  // Python's bundle carries a two-key ciphertext ("invisible salamander", RFC-6 item 2).
  if (bundle.salamander) {
    const z = bundle.salamander;
    const both = await Promise.all([z.k1, z.k2].map((k) => s.gcmOpen(unhex(k), unhex(z.nonce), unhex(z.ct), new Uint8Array(0)).then((p) => hex(p), () => null)));
    ok('salamander: AES-GCM accepts one ciphertext under two keys', both[0] !== null && both[1] !== null && both[0] !== both[1]);
    const c1 = s.b64u(await s.commitment(unhex(z.k1), unhex(z.nonce), unhex(z.ct), z.description));
    const c2 = s.b64u(await s.commitment(unhex(z.k2), unhex(z.nonce), unhex(z.ct), z.description));
    ok('salamander: commitment accepts k1 and rejects k2', c1 === z.commit && c2 !== z.commit);
  }
  return results;
}

/** Re-wrapping and carry-over (§3.6): same entry under a new lock keeps nonce, ct and commit. */
export async function checkCarry() {
  const lockA = { lock: 'ka', epoch: 1, home: HOME, key: s.random(32) }, lockD = { lock: 'kd', epoch: 1, home: HOME, key: s.random(32) };
  const first = await s.sealEntry({ origin: ORIGIN, id: ID, entry: 'e1', plaintext: { content_md: 'x', content_html: 'x' }, description: 'c', locks: [lockA] });
  const next = await s.sealEntry({ origin: ORIGIN, id: ID, entry: 'e1', description: 'c', locks: [lockA, lockD], carry: first });
  const same = ['nonce', 'ct', 'commit'].every((k) => first.entry[k] === next.entry[k]);
  const opens = (await s.openEntry(next.entry, { origin: ORIGIN, id: ID, description: 'c', held: { 'kd:1': lockD.key } })).status === 'opened';
  return { 'carry-over keeps nonce, ct, commit byte for byte': same ? 'pass' : 'FAIL', 'widened entry opens under the new lock': opens ? 'pass' : 'FAIL' };
}

/** Document bytes added per sealed span, by plaintext size and wrap count. */
export async function measureSizes() {
  const rows = [];
  for (const [name, words] of [['3 words', 3], ['40 words', 40], ['400 words', 400], ['4,000 words', 4000], ['40,000 words', 40000]]) {
    const md = 'word '.repeat(words).trim();
    for (const wraps of [1, 2, 5]) {
      const locks = Array.from({ length: wraps }, (_, i) => ({ lock: 'k' + s.base32(s.random(10)), epoch: 1, home: HOME, key: s.random(32) }));
      const { entry } = await s.sealEntry({ origin: ORIGIN, id: ID, entry: 'e1', plaintext: { content_md: md, content_html: `<p>${md}</p>` }, description: 'cover', selector: { exact: 'cover', prefix: 'the ', suffix: ' here' }, locks });
      rows.push({ plaintext: name, plaintextBytes: s.utf8(JSON.stringify({ content_md: md, content_html: `<p>${md}</p>` })).length, wraps, entryJsonBytes: s.utf8(JSON.stringify(entry)).length });
    }
  }
  return rows;
}

/** Mean milliseconds to seal and to open a short span, timed over a batch of n (browsers
 * coarsen performance.now, so single runs read 0; a Worker's clock does not move without I/O). */
export async function measureTimes(n = 200) {
  const lock = { lock: 'ka', epoch: 1, home: HOME, key: s.random(32) };
  const entries = [];
  let t = performance.now();
  for (let i = 0; i < n; i++) entries.push((await s.sealEntry({ origin: ORIGIN, id: ID, entry: 'e1', plaintext: { content_md: 'Northwind Capital', content_html: 'Northwind Capital' }, description: 'the acquirer', locks: [lock] })).entry);
  const seal = performance.now() - t;
  t = performance.now();
  for (const entry of entries) await s.openEntry(entry, { origin: ORIGIN, id: ID, description: 'the acquirer', held: { 'ka:1': lock.key } });
  const open = performance.now() - t;
  return { runs: n, sealMs: +(seal / n).toFixed(3), openMs: +(open / n).toFixed(3), clockMoved: seal > 0 };
}
