# R8 — the probe: RFC-6's constructs in five runtimes

**Research, not a design · session 81, 2026-11-22 · Opus 5.5, on Venkat's word (session 81),
before RFC-6's comment period closes on 2026-11-28.** Inputs to RFC-6 §9 items 2, 3, 4, 11
and 28 at the close. Code in [`r8-probe/`](r8-probe/): `seal.mjs` (WebCrypto only),
`scenario.mjs`, `probe.py` (Python `cryptography`, written apart from the JavaScript),
`run-node.mjs`, `run-runtimes.mjs`. Nothing was built in blygger-studio.

**Keys.** Every key here is generated in memory, protects nothing and is thrown away;
`security-policy.md`'s Rules 1–2 govern keys that are deployed or kept, so none applied. The
runs' bundles (with their throwaway keys) are written to `r8-probe/out/`, which git ignores.

## What ran

Each runtime seals a bundle (a thread with a sealed span under two locks, a nested span
under a third, a whole-item seal with `about`, an HPKE grant of a lock key at its derived
path, and a request MAC) and **opens every other runtime's bundle**:

| Runtime | Version | Cross-opens |
|---|---|---|
| Node | 24.21.0 | all pass |
| Chromium | HeadlessChrome 156 (Playwright 1.64) | all pass |
| WebKit | Safari 27.2 engine (Playwright) | all pass |
| workerd | Miniflare 5 (the Workers runtime, local) | all pass |
| Python | `cryptography` 48.0.0 (OpenSSL), native HPKE | all pass |

Checks per bundle: open via lock A, via lock B (OR), cover only without a key, the nested
span via lock C (AND), a wrong description fails the commitment, an entry transplanted to
another item does not open (AAD), the whole-item seal opens, the grant path agrees from
both sides, the HPKE grant opens to the lock key, a grant does not open under another
subject, the request MAC agrees, and (Python's bundle) the salamander below. Carry-over
(§3.6): a widened entry keeps `nonce`, `ct` and `commit` byte for byte and opens under the
new lock. **Not run:** Firefox (not installed here), Go (not installed), a deployed Worker,
a real iOS device. Go 1.26's `crypto/hpke` remains RFC-6's claim, unchecked.

## Findings

1. **Item 3, the suite: works without flags everywhere tested.** X25519, HKDF and AES-GCM
   are in WebCrypto in Node, Chromium, WebKit and workerd. **WebCrypto has no HPKE**: the
   probe composes it from X25519, HMAC and AES-GCM in about 40 lines, and **it
   interoperates in both directions with OpenSSL's native HPKE** — the check that matters,
   since two hand-written HPKEs could share a bug. Every decrypting client will carry such
   a composition or a library; the 0.5 text should cite RFC 9180 test vectors.

2. **Item 2, the commitment: confirmed against a real two-key ciphertext.** `probe.py`
   builds an "invisible salamander" by solving GHASH for one ciphertext block (5.7 ms): one
   AES-GCM ciphertext and tag that **both OpenSSL and WebCrypto accept under two different
   keys**, to two different plaintexts. The §3.4 commitment accepts the first key and
   rejects the second in every runtime. Without the commitment, equivocation is real.

3. **Item 11 and every `‖`: RFC-6 does not yet define the bytes.** The two implementations
   agree only because both follow choices the RFC does not make. Each is marked `ENCODING`
   in `seal.mjs`:
   - **Bare `‖` is unambiguous today only by accident.** `origin ‖ id ‖ entry` splits one
     way because an identity origin ends in `/` (§12.2) and an id is 26 base32 characters
     with no `/`; nothing in RFC-6 says the AAD relies on that. `lock ‖ epoch` has no such
     luck if the epoch is written as decimal text: lock `k1` at epoch 23 and lock `k12` at
     epoch 3 give the same bytes, and lock ids are opaque. The probe length-prefixes every
     variable field (2-byte big-endian length) and writes the epoch as 4 bytes. Recommend
     the text fix an encoding rather than lean on field shapes.
   - **Unstated:** the epoch's encoding in the wrap AAD (probe: 4-byte big-endian); the
     wrap `key` layout (probe: nonce ‖ ciphertext ‖ tag, 60 bytes, as §3.3's arithmetic
     implies); the base32 alphabet and case (probe: RFC 4648, lowercase, unpadded; 16 bytes
     give 26 characters); HKDF output lengths (16 for a path, 32 for the request key); the
     form of `at` (probe: RFC 3339 UTC to the second); that the home URL used as salt is the
     exact string in the wrap's `home`.
   - **The HPKE `info` of a grant is unspecified.** The probe binds the subject
     (`"blyg-grant-v1" ‖ len ‖ subject`), so a grant for one lock or entry cannot be served
     as another's; a test confirms it. Recommend the 0.5 text require it.
   - An implementer note: HKDF's empty salt is HashLen zero bytes; the probe passes those
     rather than a zero-length HMAC key, which WebCrypto engines need not accept.

4. **Item 4, padding: the floor is right; the powers of two cost up to 2× in the middle.**
   Entry JSON (one wrap, base64url, selector and commitment included) against its
   plaintext object:

   | Sealed words | Plaintext | Entry, 1 wrap | 2 wraps | 5 wraps | Ratio (1 wrap) |
   |---|---|---|---|---|---|
   | 3 | 70 B | 702 B | 865 B | 1,354 B | 10.0 |
   | 40 | 440 B | 1,043 B | 1,206 B | 1,695 B | 2.4 |
   | 400 | 4.0 KB | 5.8 KB | 6.0 KB | 6.5 KB | 1.4 |
   | 4,000 | 40 KB | 87.7 KB | 87.9 KB | 88.4 KB | 2.2 |
   | 40,000 | 400 KB | 612 KB | 612 KB | 613 KB | 1.5 |

   A short span costs about 700 bytes and each further wrap about 163, so redaction is
   cheap. Above a few KB, padding to the next power of two plus base64's third can reach
   about 2.7× just past a boundary. **For Fable:** keep the 256-byte floor; above it,
   consider Padmé (Nikitin et al., PURBs, 2019), which leaks O(log log n) bits of length at
   no more than 12% overhead, or powers of two to 4 KiB and 4 KiB steps after.

5. **Speed is not a constraint.** Per short span, sealing and opening each take 0.04–0.3 ms
   (Chromium 0.04, workerd 0.04, Node 0.12, WebKit 0.29, means over 200 runs; workerd under
   Miniflare, whose clock moved, unlike a deployed Worker's). A thread with dozens of spans
   decrypts in a few milliseconds.

6. **Item 28, the request proof: works as written** once `at`'s format and the field
   encoding are fixed (finding 3). The five-minute window was not exercised.

7. **Item 16, post-quantum.** OpenSSL through `cryptography` 48 already offers HPKE with
   ML-KEM-768 + X25519; WebCrypto offers no ML-KEM. Reserving `alg` and disclosing is
   right for 0.5: a hybrid suite today would mean a WASM library in every browser reader.

**Not exercised:** quote copies with `from` (§3.9; `openEntry` supports the AAD, untested),
encrypted media (§3.8), epochs and rotation, lapse notices, the home's HTTP surface. None
of these changes the primitives; each is wire shape the build will exercise.

## For the close

Items 2 and 3 can be ruled on this evidence. Item 4 has a measured alternative. Item 11's
"two implementations agreeing" test is met **only with finding 3's encodings written into
the text**; the RFC's next version (or the 0.5 document) should state them, and Opus can
draft that section from `seal.mjs` when Fable rules.
