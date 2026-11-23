"""R8 probe, the second implementation: RFC-6's constructs on Python's `cryptography`
(OpenSSL), written apart from seal.mjs, with the same ENCODING choices (../r8-probe.md).

  /opt/homebrew/bin/python3 -I probe.py      seal out/bundle-python.json, open every out/bundle-*.json

It also builds an "invisible salamander" (RFC-6 item 2): one AES-GCM ciphertext and tag that
decrypt validly under two keys, to show the commitment is what rejects the second key.
"""
import base64, glob, hashlib, hmac, json, os, struct, sys, time
from cryptography.hazmat.primitives import hashes, hpke
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption

ORIGIN, HOME = "https://blyg.example.org/", "https://keys.example.org/"
ID, ID2 = "5q1k8w3zc7n0d2v9h6m4r8t2xa", "7c2m9q4x1z8w3n6v0k5r2t7bpa"
HERE = os.path.dirname(os.path.abspath(__file__))

b64u = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
unb64u = lambda s: base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))
b32 = lambda b: base64.b32encode(b).decode().rstrip("=").lower()
lp = lambda b: struct.pack(">H", len(b)) + b
sha = lambda b: hashlib.sha256(b).digest()

def bucket(n):
    if n <= 256: return 256
    if n <= 65536: return 1 << (n - 1).bit_length()
    return -(-n // 65536) * 65536

def pad(b):
    out = struct.pack(">I", len(b)) + b
    return out + bytes(bucket(len(out)) - len(out))

def unpad(b):
    n = struct.unpack(">I", b[:4])[0]
    if n > len(b) - 4 or any(b[4 + n:]): raise ValueError("bad padding")
    return b[4:4 + n]

entry_aad = lambda o, i, e: b"blyg-seal-v1" + lp(o.encode()) + lp(i.encode()) + lp(e.encode())
wrap_aad = lambda lock, epoch, commit: b"blyg-wrap-v1" + lp(lock.encode()) + struct.pack(">I", epoch) + commit
commitment = lambda key, nonce, ct, desc: sha(b"blyg-commit-v1" + key + nonce + sha(ct) + sha(desc.encode()))
hkdf = lambda ikm, salt, info, n: HKDF(hashes.SHA256(), n, salt, info).derive(ikm)
grant_path = lambda shared, subject: b32(hkdf(shared, HOME.encode(), b"blyg-grant-v1" + subject.encode(), 16))
grant_info = lambda subject: b"blyg-grant-v1" + lp(subject.encode())
SUITE = hpke.Suite(hpke.KEM.X25519, hpke.KDF.HKDF_SHA256, hpke.AEAD.AES_256_GCM)

def request_mac(shared, url, at):
    k = hkdf(shared, HOME.encode(), b"blyg-request-v1", 32)
    return b64u(hmac.new(k, b"blyg-request-v1" + lp(url.encode()) + at.encode(), hashlib.sha256).digest())

def seal_entry(origin, id_, entry, plaintext, description, locks, selector=None, about=None):
    key, nonce = os.urandom(32), os.urandom(12)
    ct = AESGCM(key).encrypt(nonce, pad(json.dumps(plaintext).encode()), entry_aad(origin, id_, entry))
    commit = commitment(key, nonce, ct, description)
    wraps = []
    for l in locks:
        wn = os.urandom(12)
        wraps.append({"lock": l["lock"], "epoch": l["epoch"], "home": HOME, "key": b64u(wn + AESGCM(l["key"]).encrypt(wn, key, wrap_aad(l["lock"], l["epoch"], commit)))})
    e = {"entry": entry, "wraps": wraps, "commit": b64u(commit), "nonce": b64u(nonce), "ct": b64u(ct)}
    if selector: e["selector"] = selector
    if about: e["about"] = about
    return e

def open_entry(e, origin, id_, description, held):
    commit, nonce, ct = unb64u(e["commit"]), unb64u(e["nonce"]), unb64u(e["ct"])
    key = None
    for w in e["wraps"]:
        lk = held.get(f"{w['lock']}:{w['epoch']}")
        if lk:
            blob = unb64u(w["key"])
            key = AESGCM(lk).decrypt(blob[:12], blob[12:], wrap_aad(w["lock"], w["epoch"], commit))
            break
    if key is None: return "no key", None
    if commitment(key, nonce, ct, description) != commit: return "commitment mismatch", None
    return "opened", json.loads(unpad(AESGCM(key).decrypt(nonce, ct, entry_aad(origin, id_, e["entry"]))))

# ---- the salamander: GHASH arithmetic in GF(2^128), GCM's bit order (SP 800-38D)
R = 0xE1 << 120
def gmul(x, y):
    z, v = 0, y
    for i in range(127, -1, -1):
        if (x >> i) & 1: z ^= v
        v = (v >> 1) ^ R if v & 1 else v >> 1
    return z
def gpow(x, n):
    r = 1 << 127  # the field's 1 in GCM's reflected order
    while n:
        if n & 1: r = gmul(r, x)
        x, n = gmul(x, x), n >> 1
    return r
ginv = lambda x: gpow(x, (1 << 128) - 2)
ecb = lambda k, block: Cipher(algorithms.AES(k), modes.ECB()).encryptor().update(block)
toint = lambda b: int.from_bytes(b, "big")
tobytes = lambda n: n.to_bytes(16, "big")

def salamander(blocks=3):
    """One ciphertext (no AAD, 96-bit nonce) whose tag verifies under two different keys."""
    k1, k2, nonce = os.urandom(32), os.urandom(32), os.urandom(12)
    h1, h2 = toint(ecb(k1, bytes(16))), toint(ecb(k2, bytes(16)))
    j0 = nonce + b"\x00\x00\x00\x01"
    s1, s2 = toint(ecb(k1, j0)), toint(ecb(k2, j0))
    c = [toint(os.urandom(16)) for _ in range(blocks - 1)]
    length = toint(struct.pack(">QQ", 0, blocks * 128))
    m = blocks + 1  # blocks plus the length block; block i (1-based) is multiplied by H^(m-i+1)
    rhs = s1 ^ s2 ^ gmul(length, h1 ^ h2)
    for i, ci in enumerate(c, start=1):
        rhs ^= gmul(ci, gpow(h1, m - i + 1) ^ gpow(h2, m - i + 1))
    coeff = gpow(h1, 2) ^ gpow(h2, 2)  # the last ciphertext block, i = blocks, gets H^2
    c.append(gmul(rhs, ginv(coeff)))
    ghash = 0
    for b in c + [length]: ghash = gmul(ghash ^ b, h1)
    tag = tobytes(s1 ^ ghash)
    ct = b"".join(tobytes(b) for b in c) + tag
    return k1, k2, nonce, ct

def make_bundle():
    lock = lambda p, e: {"lock": p + b32(os.urandom(10)), "epoch": e, "key": os.urandom(32)}
    A, B, C = lock("ka", 2), lock("kb", 1), lock("kc", 1)
    inner = seal_entry(ORIGIN, ID, "e2", {"content_md": "at $41 a share", "content_html": "at $41 a share"}, "a price", [C])
    outer = seal_entry(ORIGIN, ID, "e1", {"content_md": "Northwind Capital, [a price]", "content_html": 'Northwind Capital, <span class="blyg-sealed" data-blyg-entry="e2">a price</span>', "sealed": [inner]},
                       "the acquirer", [A, B], selector={"exact": "the acquirer", "prefix": "offer from ", "suffix": ". The board"})
    item = {"blyg": "0.5", "id": ID, "kind": "thread", "version": 4, "origin": ORIGIN,
            "content_md": "There is an acquisition offer from the acquirer. The board meets on Friday.",
            "content_html": '<p>There is an acquisition offer from <span class="blyg-sealed" data-blyg-entry="e1">the acquirer</span>. The board meets on Friday.</p>',
            "sealed": [outer]}
    whole = seal_entry(ORIGIN, ID2, "e1", {"content_md": "Minutes of the board.", "content_html": "<p>Minutes…</p>"}, "Board minutes for November", [A], about="Board minutes for November")
    home, recipient = X25519PrivateKey.generate(), X25519PrivateKey.generate()
    raw_priv = lambda k: k.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption()).hex()
    raw_pub = lambda k: k.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw).hex()
    subject = f"lock:{A['lock']}:{A['epoch']}"
    shared = home.exchange(recipient.public_key())
    url, at = f"{HOME}l/{A['lock']}", "2026-11-22T20:00:00Z"
    k1, k2, nonce, ct = salamander()
    desc = "the acquirer"
    hexkeys = lambda l: {**l, "home": HOME, "key": l["key"].hex()}
    return {
        "label": "python cryptography " + __import__("cryptography").__version__,
        "item": item, "whole": {"id": ID2, "entry": whole, "description": "Board minutes for November"},
        "keys": {"A": hexkeys(A), "B": hexkeys(B), "C": hexkeys(C)},
        "grant": {"home": {"priv": raw_priv(home), "pub": raw_pub(home)}, "recipient": {"priv": raw_priv(recipient), "pub": raw_pub(recipient)},
                  "subject": subject, "blob": b64u(SUITE.encrypt(A["key"], recipient.public_key(), info=grant_info(subject))), "path": grant_path(shared, subject)},
        "request": {"url": url, "at": at, "mac": request_mac(shared, url, at)},
        "salamander": {"k1": k1.hex(), "k2": k2.hex(), "nonce": nonce.hex(), "ct": ct.hex(), "description": desc, "commit": b64u(commitment(k1, nonce, ct, desc))},
    }

def check_bundle(b):
    res = {}
    ok = lambda name, cond, detail="": res.__setitem__(name, "pass" if cond else f"FAIL {detail}".strip())
    held = lambda *names: {f"{b['keys'][n]['lock']}:{b['keys'][n]['epoch']}": bytes.fromhex(b["keys"][n]["key"]) for n in names}
    it, e1 = b["item"], b["item"]["sealed"][0]
    st, pa = open_entry(e1, it["origin"], it["id"], "the acquirer", held("A"))
    ok("open span via lock A", st == "opened" and pa["content_md"].startswith("Northwind"), st)
    ok("open span via lock B (OR)", open_entry(e1, it["origin"], it["id"], "the acquirer", held("B"))[0] == "opened")
    ok("no key: cover only", open_entry(e1, it["origin"], it["id"], "the acquirer", held("C"))[0] == "no key")
    st2, p2 = open_entry(pa["sealed"][0], it["origin"], it["id"], "a price", held("C"))
    ok("open nested span via lock C (AND)", st2 == "opened" and p2["content_md"] == "at $41 a share", st2)
    ok("wrong description fails the commitment", open_entry(e1, it["origin"], it["id"], "someone else", held("A"))[0] == "commitment mismatch")
    try:
        open_entry(e1, it["origin"], "0000000000000000000000000a", "the acquirer", held("A")); ok("entry transplanted to another item does not open (AAD)", False)
    except Exception:
        ok("entry transplanted to another item does not open (AAD)", True)
    w = b["whole"]
    ok("open whole-item seal", open_entry(w["entry"], it["origin"], w["id"], w["description"], held("A"))[0] == "opened")
    g = b["grant"]
    rec = X25519PrivateKey.from_private_bytes(bytes.fromhex(g["recipient"]["priv"]))
    shared = rec.exchange(X25519PublicKey.from_public_bytes(bytes.fromhex(g["home"]["pub"])))
    ok("grant path agrees (recipient side)", grant_path(shared, g["subject"]) == g["path"])
    ok("HPKE grant opens to lock A key (OpenSSL HPKE)", SUITE.decrypt(unb64u(g["blob"]), rec, info=grant_info(g["subject"])).hex() == b["keys"]["A"]["key"])
    try:
        SUITE.decrypt(unb64u(g["blob"]), rec, info=grant_info("lock:other:1")); ok("grant for one subject does not open as another", False)
    except Exception:
        ok("grant for one subject does not open as another", True)
    ok("request MAC agrees (recipient computes, home checks)", request_mac(shared, b["request"]["url"], b["request"]["at"]) == b["request"]["mac"])
    if "salamander" in b:
        z = b["salamander"]
        n, ct = bytes.fromhex(z["nonce"]), bytes.fromhex(z["ct"])
        p1, p2 = AESGCM(bytes.fromhex(z["k1"])).decrypt(n, ct, None), AESGCM(bytes.fromhex(z["k2"])).decrypt(n, ct, None)
        ok("salamander: AES-GCM accepts one ciphertext under two keys", p1 != p2)
        c1, c2 = (b64u(commitment(bytes.fromhex(z[k]), n, ct, z["description"])) for k in ("k1", "k2"))
        ok("salamander: commitment accepts k1 and rejects k2", c1 == z["commit"] and c2 != z["commit"])
    return res

if __name__ == "__main__":
    out = os.path.join(HERE, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "bundle-python.json"), "w") as f: json.dump(make_bundle(), f, indent=1)
    report = {"runtime": f"python {sys.version.split()[0]}", "opened": {}}
    for path in sorted(glob.glob(os.path.join(out, "bundle-*.json"))):
        report["opened"][os.path.basename(path)] = check_bundle(json.load(open(path)))
    t0 = time.perf_counter(); salamander(); report["salamanderMs"] = round((time.perf_counter() - t0) * 1000, 1)
    with open(os.path.join(out, "report-python.json"), "w") as f: json.dump(report, f, indent=1)
    print(json.dumps(report["opened"], indent=1))
