/*
 * mentions.als — origin identity on the subscribe side (§12.2, decision
 * #17) and inbound Webmention structural verification (§15.4, #28).
 * A static model: one snapshot of "who serves what bytes at which URL",
 * with an adversarial publisher free to write any JSON it likes.
 *
 * Key modelling choice: an identity origin is a BASE URL — scheme, host,
 * port AND PATH (§14 mount independence, #14; §12.2 "the URL the manifest
 * was actually fetched from, minus blyg.json"). Several origins may share a
 * host: `example.com/alice/` and `example.com/bob/` (the "N origins under
 * one host" shape of decision #36). A URL `under` an origin is one inside
 * its mount — whoever runs that origin controls those bytes.
 */
module mentions

sig Host {}

-- An identity origin (§5.9, §12.2): a base URL on a host.
sig Origin { host: one Host }

sig Item { home: one Origin }

abstract sig Kind {}
one sig Thread, Withdrawn extends Kind {}

-- A JSON item document as served (live item document or pinned version file).
sig Doc {
  claims: one Origin,     -- its "origin" member: self-asserted
  item: one Item,
  kind: one Kind,
  pin: lone Pin,          -- present iff this is an items/{id}/v{n}.json file
  stubOf: lone Item       -- stub_of naming {origin: home of that item, id}
}
one sig Pin {}

-- A URL. `under` = the origin whose mount contains it (none: outside any blyg).
sig Url { host: one Host, under: lone Origin, serves: lone Doc }

-- The live item document of each item, at {origin}items/{id}.json.
one sig Live { at: Item -> one Url }

fact urls {
  all u: Url | some u.under => u.under.host = u.host
  all i: Item | let u = Live.at[i] { u.under = i.home and u.serves.item = i and no u.serves.pin }
  -- an origin's own live document for an item it owns states its own origin
  all i: Item | Live.at[i].serves.claims = i.home
  -- §9: an endcap "omits stub_of"
  all d: Doc | d.kind = Withdrawn => (no d.stubOf and no d.pin)
  -- pins are never endcaps (§8 r2) and a pin of item i lives under i's origin
  all u: Url, d: u.serves | some d.pin => u.under = d.item.home
  all d: Doc | d.stubOf != d.item
}

-- §15.4 as written. step 1: source is JSON with a blyg key → it is the item
-- document (we model the source as serving it directly) [C-15.4-02];
-- step 2: "The document's origin MUST equal the final source URL's origin
-- (scheme, host, port ...)" [C-15.4-03]; step 3: withdrawn → gone;
-- step 4: stub_of naming the target.
pred verifiesAsWritten[src: Url, t: Item] {
  some d: src.serves {
    d.claims.host = src.host
    d.kind != Withdrawn
    d.stubOf = t
  }
}

-- Variant A (path-aware step 2): the document's origin must be the origin
-- whose mount contains the source URL, i.e. a prefix match on the full base
-- URL including path, not just scheme/host/port.
pred verifiesPathAware[src: Url, t: Item] {
  some d: src.serves {
    d.claims = src.under
    d.kind != Withdrawn
    d.stubOf = t
  }
}

-- Variant B (also consult the live document): after step 2, read the
-- claimed item's live document {origin}items/{id}.json, and test steps 3–4
-- against THAT rather than against whatever file the source URL served.
pred verifiesViaLive[src: Url, t: Item] {
  some d: src.serves {
    d.claims = src.under
    let l = Live.at[d.item].serves | l.kind != Withdrawn and l.stubOf = t
  }
}

------------------------------------------------------------------------
-- Assertions
------------------------------------------------------------------------

-- 7a. ImpostorFails: a verified mention is attributed (§15.4 step 5 records
-- the document's `origin`) to the origin that actually controls the source
-- bytes. Expected: FAILS as written, when two origins share a host.
assert ImpostorFails {
  all src: Url, t: Item | verifiesAsWritten[src, t] => src.serves.claims = src.under
}

-- 7b. Same property, one origin per host (the deployments live today).
-- A mirror on another host copying a real blyg's documents fails step 2.
-- (Premise also: every URL on an origin's host is inside its mount, i.e.
-- the host has one operator.)
assert ImpostorFails_OneOriginPerHost {
  ((all disj a, b: Origin | a.host != b.host)
   and (all u: Url | (some o: Origin | o.host = u.host) => some u.under)) =>
    all src: Url, t: Item | verifiesAsWritten[src, t] => src.serves.claims = src.under
}

-- 7c. Same property under the path-aware variant of step 2.
assert ImpostorFails_PathAware {
  all src: Url, t: Item | verifiesPathAware[src, t] => src.serves.claims = src.under
}

-- 7d. §9: "A withdrawn stub stops verifying as a stub, because its endcap
-- omits stub_of" [C-9-01]. Expected: FAILS as written — a pinned version
-- file of the stub still carries stub_of (§8 r5) and is "JSON with a blyg key".
assert WithdrawnStubStopsVerifying {
  -- no co-hosted origins and no stray URLs, so 7a's impostor is excluded
  ((all disj a, b: Origin | a.host != b.host) and (all u: Url | some u.under)
   and (all u: Url | u.serves.claims = u.under)) =>
  all src: Url, t: Item | verifiesAsWritten[src, t] =>
    Live.at[src.serves.item].serves.kind != Withdrawn
}

-- 7e. Same under variant B. Expected: holds.
assert WithdrawnStubStopsVerifying_ViaLive {
  all src: Url, t: Item | verifiesViaLive[src, t] =>
    Live.at[src.serves.item].serves.kind != Withdrawn
}

------------------------------------------------------------------------
-- Subscription identity (§12.2, #17)
------------------------------------------------------------------------

-- A manifest fetch: the URL the reader started from, a bounded redirect
-- chain, and the manifest's self-asserted `site`.
sig Fetch { start: one Url, final: one Url, site: one Origin, identity: lone Origin }
fact fetchRules {
  all f: Fetch {
    -- "Subscription identity is the final fetch origin ... after following
    -- redirects. The manifest's self-asserted site is display-advisory only."
    -- "MUST NOT adopt the asserted value as identity" [C-12.2-01]
    f.identity = f.final.under
  }
}

-- 7f. A mirror cannot become the identity of the origin it copies: if a
-- subscription's identity is O, the manifest bytes came from inside O.
assert MirrorCannotTakeIdentity {
  all f: Fetch | some f.identity => f.final.under = f.identity
  all f: Fetch | f.site != f.final.under => f.identity != f.site
}

check ImpostorFails for 4 but 2 Host, 3 Item
check ImpostorFails_OneOriginPerHost for 4 but 3 Item
check ImpostorFails_PathAware for 5 but 3 Item
check WithdrawnStubStopsVerifying for 4 but 3 Item
check WithdrawnStubStopsVerifying_ViaLive for 5 but 3 Item
check MirrorCannotTakeIdentity for 5

run Vac_VerifiedStub { some src: Url, t: Item | verifiesAsWritten[src, t] and some src.under } for 4
run Vac_PathAwareVerified { some src: Url, t: Item | verifiesPathAware[src, t] and some o: Origin - src.under | o.host = src.host } for 4
run Vac_ViaLiveVerified { some src: Url, t: Item | verifiesViaLive[src, t] and some src.serves.pin } for 4
run Vac_MirrorSubscription { some f: Fetch | f.site != f.final.under and some f.identity } for 4
