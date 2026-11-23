// R8 probe: RFC-6's sealing, wrapping, commitment, HPKE grants, grant paths and request MAC,
// on WebCrypto alone, so the same file runs in Node, Chromium, WebKit, Firefox and a Worker.
// Throwaway research code (v0.5-plan §10 item 4). Where RFC-6 leaves a byte encoding open,
// the choice made here is marked ENCODING and listed in ../r8-probe.md.
const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();

export const utf8 = (s) => te.encode(s);
export const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
export const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
// ENCODING: RFC 4648 base32, lowercase, unpadded. 16 bytes give 26 characters.
export function base32(bytes) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
// ENCODING: every variable-length field inside a ‖ concatenation is a 2-byte big-endian
// length followed by its bytes. RFC-6 writes bare ‖, which is ambiguous for adjacent
// variable fields (origin ‖ id ‖ entry; lock ‖ epoch).
export const lp = (bytes) => concat(new Uint8Array([bytes.length >> 8, bytes.length & 255]), bytes);
const u32 = (n) => new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

export async function sha256(bytes) { return new Uint8Array(await subtle.digest('SHA-256', bytes)); }
async function hmac(key, data) {
  const k = await subtle.importKey('raw', key.length ? key : new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', k, data));
}
// RFC 5869, split so HPKE can use Extract and Expand apart. An empty salt is HashLen zeros.
export const hkdfExtract = (salt, ikm) => hmac(salt, ikm);
export async function hkdfExpand(prk, info, length) {
  let t = new Uint8Array(0), out = new Uint8Array(0);
  for (let i = 1; out.length < length; i++) {
    t = await hmac(prk, concat(t, info, new Uint8Array([i])));
    out = concat(out, t);
  }
  return out.slice(0, length);
}
export const hkdf = async (ikm, salt, info, length) => hkdfExpand(await hkdfExtract(salt, ikm), info, length);

async function aesKey(raw) { return subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
export async function gcmSeal(key, nonce, plaintext, aad) {
  return new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, await aesKey(key), plaintext));
}
export async function gcmOpen(key, nonce, ciphertext, aad) {
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, await aesKey(key), ciphertext));
}

// §3.3 padding: 4-byte big-endian length, zeros to the next bucket (256, powers of two to
// 64 KiB, then multiples of 64 KiB). The length prefix counts toward the bucket.
export function bucket(n) {
  if (n <= 256) return 256;
  if (n <= 65536) return 2 ** Math.ceil(Math.log2(n));
  return Math.ceil(n / 65536) * 65536;
}
export function pad(bytes) {
  const out = new Uint8Array(bucket(bytes.length + 4));
  out.set(u32(bytes.length), 0); out.set(bytes, 4);
  return out;
}
export function unpad(bytes) {
  const n = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
  if (n > bytes.length - 4) throw new Error('bad padding length');
  for (let i = 4 + n; i < bytes.length; i++) if (bytes[i] !== 0) throw new Error('non-zero padding');
  return bytes.slice(4, 4 + n);
}

const entryAad = (origin, id, entry) => concat(utf8('blyg-seal-v1'), lp(utf8(origin)), lp(utf8(id)), lp(utf8(entry)));
// ENCODING: epoch is a 4-byte big-endian integer; commit is its 32 raw bytes.
const wrapAad = (lock, epoch, commit) => concat(utf8('blyg-wrap-v1'), lp(utf8(lock)), u32(epoch), commit);

export async function commitment(entryKey, nonce, ct, descText) {
  const desc = await sha256(utf8(descText));
  return sha256(concat(utf8('blyg-commit-v1'), entryKey, nonce, await sha256(ct), desc));
}

/**
 * Seals one entry. `plaintext` is §3.2's content object; `description` is `about` if
 * present, else the cover's text content; `locks` are { lock, epoch, home, key } with a
 * 32-byte raw key. `carry` re-emits a previous entry byte for byte (§3.6) with new wraps.
 */
export async function sealEntry({ origin, id, entry, plaintext, description, about, selector, locks, carry }) {
  let entryKey, nonce, ct, commit;
  if (carry) {
    ({ entryKey } = carry);
    nonce = unb64u(carry.entry.nonce); ct = unb64u(carry.entry.ct); commit = unb64u(carry.entry.commit);
  } else {
    entryKey = random(32); nonce = random(12);
    ct = await gcmSeal(entryKey, nonce, pad(utf8(JSON.stringify(plaintext))), entryAad(origin, id, entry));
    commit = await commitment(entryKey, nonce, ct, description);
  }
  const wraps = [];
  for (const l of locks) {
    const wn = random(12);
    const wrapped = await gcmSeal(l.key, wn, entryKey, wrapAad(l.lock, l.epoch, commit));
    wraps.push({ lock: l.lock, epoch: l.epoch, home: l.home, key: b64u(concat(wn, wrapped)) });
  }
  const out = { entry, ...(selector ? { selector } : {}), ...(about ? { about } : {}), wraps, commit: b64u(commit), nonce: b64u(nonce), ct: b64u(ct) };
  return { entry: out, entryKey };
}

/** Opens an entry with any held lock key (`held` maps "lock:epoch" to a raw key), or a known entry key. */
export async function openEntry(e, { origin, id, description, held = {}, entryKey }) {
  const commit = unb64u(e.commit), nonce = unb64u(e.nonce), ct = unb64u(e.ct);
  let key = entryKey, via = entryKey ? 'entry key' : undefined;
  for (const w of e.wraps) {
    if (key) break;
    const lockKey = held[`${w.lock}:${w.epoch}`];
    if (!lockKey) continue;
    const blob = unb64u(w.key);
    key = await gcmOpen(lockKey, blob.slice(0, 12), blob.slice(12), wrapAad(w.lock, w.epoch, commit));
    via = `lock ${w.lock}@${w.epoch}`;
  }
  if (!key) return { status: 'no key' };
  // §4 step 6: check the commitment before anything is shown.
  const expected = await commitment(key, nonce, ct, description);
  if (b64u(expected) !== e.commit) return { status: 'commitment mismatch' };
  const plain = unpad(await gcmOpen(key, nonce, ct, entryAad(e.from?.origin ?? origin, e.from?.id ?? id, e.from?.entry ?? e.entry)));
  return { status: 'opened', via, plaintext: JSON.parse(td.decode(plain)), key };
}

// ---- X25519 and HPKE (RFC 9180 base mode, DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-256-GCM)

export async function x25519Pair() {
  const pair = await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
  const jwk = await subtle.exportKey('jwk', pair.privateKey);
  return { priv: unb64u(jwk.d), pub: new Uint8Array(await subtle.exportKey('raw', pair.publicKey)) };
}
async function importPriv(priv, pub) {
  return subtle.importKey('jwk', { kty: 'OKP', crv: 'X25519', d: b64u(priv), x: b64u(pub) }, { name: 'X25519' }, false, ['deriveBits']);
}
export async function x25519(priv, privPub, peerPub) {
  const peer = await subtle.importKey('raw', peerPub, { name: 'X25519' }, false, []);
  return new Uint8Array(await subtle.deriveBits({ name: 'X25519', public: peer }, await importPriv(priv, privPub), 256));
}

const i2osp = (n, len) => { const out = new Uint8Array(len); for (let i = len - 1; i >= 0; i--) { out[i] = n & 255; n >>>= 8; } return out; };
const KEM_ID = 0x0020, KDF_ID = 0x0001, AEAD_ID = 0x0002;
const kemSuite = concat(utf8('KEM'), i2osp(KEM_ID, 2));
const hpkeSuite = concat(utf8('HPKE'), i2osp(KEM_ID, 2), i2osp(KDF_ID, 2), i2osp(AEAD_ID, 2));
const labeledExtract = (suite, salt, label, ikm) => hkdfExtract(salt, concat(utf8('HPKE-v1'), suite, utf8(label), ikm));
const labeledExpand = (suite, prk, label, info, L) => hkdfExpand(prk, concat(i2osp(L, 2), utf8('HPKE-v1'), suite, utf8(label), info), L);

async function keySchedule(sharedSecret, info) {
  const empty = new Uint8Array(0);
  const pskIdHash = await labeledExtract(hpkeSuite, empty, 'psk_id_hash', empty);
  const infoHash = await labeledExtract(hpkeSuite, empty, 'info_hash', info);
  const context = concat(new Uint8Array([0]), pskIdHash, infoHash);
  const secret = await labeledExtract(hpkeSuite, sharedSecret, 'secret', empty);
  return { key: await labeledExpand(hpkeSuite, secret, 'key', context, 32), nonce: await labeledExpand(hpkeSuite, secret, 'base_nonce', context, 12) };
}
async function kemShared(dh, enc, pkR) {
  const prk = await labeledExtract(kemSuite, new Uint8Array(0), 'eae_prk', dh);
  return labeledExpand(kemSuite, prk, 'shared_secret', concat(enc, pkR), 32);
}
/** Single-shot HPKE seal; returns enc ‖ ciphertext (the layout OpenSSL's single-shot API uses). */
export async function hpkeSeal(pkR, plaintext, info) {
  const eph = await x25519Pair();
  const dh = await x25519(eph.priv, eph.pub, pkR);
  const { key, nonce } = await keySchedule(await kemShared(dh, eph.pub, pkR), info);
  return concat(eph.pub, await gcmSeal(key, nonce, plaintext, new Uint8Array(0)));
}
export async function hpkeOpen(skR, pkR, blob, info) {
  const enc = blob.slice(0, 32);
  const dh = await x25519(skR, pkR, enc);
  const { key, nonce } = await keySchedule(await kemShared(dh, enc, pkR), info);
  return gcmOpen(key, nonce, blob.slice(32), new Uint8Array(0));
}

// ---- §3.10 grant paths, §3.11 request proof
// ENCODING: HKDF lengths are 16 bytes for a path (128 bits, 26 base32 characters) and
// 32 bytes for the request key; salt and labels are UTF-8; the epoch in a subject is decimal.
export const subjectLock = (lock, epoch) => `lock:${lock}:${epoch}`;
export const subjectEntry = (commitB64) => `entry:${commitB64}`;
export async function grantPath(shared, homeUrl, subject) {
  return base32(await hkdf(shared, utf8(homeUrl), concat(utf8('blyg-grant-v1'), utf8(subject)), 16));
}
// ENCODING: the HPKE info of a grant binds its subject, so a grant for one lock or entry
// cannot be presented as another's. RFC-6 does not say what the info is.
export const grantInfo = (subject) => concat(utf8('blyg-grant-v1'), lp(utf8(subject)));
// ENCODING: `at` is RFC 3339 UTC to the second, e.g. 2026-11-14T22:10:05Z.
export async function requestMac(shared, homeUrl, requestUrl, at) {
  const k = await hkdf(shared, utf8(homeUrl), utf8('blyg-request-v1'), 32);
  return b64u(await hmac(k, concat(utf8('blyg-request-v1'), lp(utf8(requestUrl)), utf8(at))));
}
