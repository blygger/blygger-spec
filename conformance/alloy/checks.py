"""Metadata for every Alloy command: what it checks, what we expect, and how to
read the result. run.py executes the commands and joins results to this table.

Fields
  model      models/<model>.als
  cmd        the Alloy command name (check or run)
  title      card title
  expect     "pass"  -> no counterexample expected
             "fail"  -> a counterexample is expected (we are demonstrating it)
  cex_status status to report when a counterexample IS found:
             fail = a real spec problem; warn = ambiguity / wording / reading;
             info = behaviour the spec chose deliberately
  vacuity    name of a `run` command showing the situation is reachable
  spec       spec sentences encoded (quoted from docs/protocol-v0.3.md)
  spec_refs, decisions, clauses (ids from conformance/clauses/clauses.json)
  pass_text  plain English when no counterexample is found
  cex_text   plain English for the counterexample
  fable      text for the "For Fable" list (only when it implies a spec change)
"""

CHECKS = [
    # ------------------------------------------------------------------ 1
    dict(
        model="blygger", cmd="NoLocalSelfContainment",
        title="1a. Local closure check prevents self-containment (version-level reading)",
        expect="pass", cex_status="fail", vacuity="Vac_LocalNesting",
        spec=["A thread MUST NOT transclude a local thread whose transitive *local* transclusion closure (walked via stored `transclusions[]`) contains the publishing thread's own id."],
        spec_refs=["§10.2"], decisions=["#26"], clauses=["C-10.2-04", "C-10.2-01"],
        pass_text="If the closure walk follows the transclusions[] of the versions actually baked (recursively, as the data-blyg-* tree records them), no thread can contain — through local hops — a quote of itself.",
        cex_text="Unexpected: a thread contains itself through local hops even under the version-level reading.",
    ),
    dict(
        model="blygger", cmd="NoLocalSelfContainment_ItemReading",
        title="1a′. Local closure check, item-level reading (each local thread's current transclusions[])",
        expect="fail", cex_status="fail", vacuity="Vac_LocalNesting",
        spec=["A thread MUST NOT transclude a local thread whose transitive *local* transclusion closure (walked via stored `transclusions[]`) contains the publishing thread's own id. This is cheap and it stops the only genuinely silly case — a thread quoting a thread that quotes it"],
        spec_refs=["§10.2", "§10.3"], decisions=["#26"], clauses=["C-10.2-04", "C-10.2-01"],
        pass_text="No counterexample: the item-level walk also prevents self-containment within the scope.",
        cex_text='All on one origin. A v1 is published. B v1 quotes A v1. C v1 quotes B v1, so C\'s baked HTML holds B v1, which holds A v1. B is republished as v2 without its quote. A is republished as v2 quoting C. The closure check walks C\'s current transclusions[] (→ B) and B\'s current transclusions[] (→ nothing): A is not found, so the publish goes through. But the snapshot actually baked is C v1 ⊃ B v1 ⊃ A v1: A v2\'s own HTML contains a quote of A — the "silly doubling" the check exists to stop. Sound only if the walk follows the transclusions[] of the versions that were baked, not each item\'s current version.',
        fable=("§10.2 local closure: \"walked via stored transclusions[]\" does not say whose. Walking each local thread's current "
               "transclusions[] (the natural DB reading) lets a thread contain itself through an intermediate thread that has since been "
               "republished (counterexample 1a′). Say: walk the transclusions[] of the snapshot version being baked, and recursively of "
               "the versions those entries name (equivalently, the baked data-blyg-* tree, local layers only)."),
    ),
    dict(
        model="blygger", cmd="NoSelfContainmentAnyPath",
        title="1b. Self-containment through a remote hop (cross-origin cycle)",
        expect="fail", cex_status="info", vacuity="Vac_CrossOriginCycle",
        spec=["Remote closures are not walked: harmless by snapshot, unknowable in general.",
              "Network cycles are harmless. A snapshot is static bytes; nothing recurses at publish, and nothing resolves at read."],
        spec_refs=["§10.2"], decisions=["#26"], clauses=["C-10.2-04"],
        pass_text="No cross-origin cycle found in scope.",
        cex_text='Two origins. O2 publishes thread A v1. O1 imports it and publishes B v1 quoting A v1. O2 imports B and republishes A as v2 quoting B v1. A v2 contains B v1, which contains A v1: A quotes itself through a remote hop. The cycle the spec explicitly permits; 1c shows it is finite.',
    ),
    dict(
        model="blygger", cmd="SnapshotsWellFounded",
        title="1c. Snapshots are well-founded: no version contains itself",
        expect="pass", cex_status="fail", vacuity="Vac_CrossOriginCycle",
        spec=["The local snapshot is what gets baked — never a live fetch.",
              "Two blygs quoting each other in a loop produce finite, stale, self-contained documents, which is correct."],
        spec_refs=["§10.2", "§10.4"], decisions=["#26"], clauses=["C-10.2-01"],
        pass_text=("Over versions (not items) the quotation graph is acyclic: a version can only bake versions that were already published "
                   "when it was. So every baked document is finite, which is what makes 1b harmless — the spec's claim holds."),
        cex_text="Unexpected: a version contains itself.",
    ),
    # ------------------------------------------------------------------ 2
    dict(
        model="blygger", cmd="ServedIsPromised",
        title="2. Served is promised: only live + pinned are served; pins survive withdrawal",
        expect="pass", cex_status="fail", vacuity="Vac_PinSurvivesWithdrawal",
        spec=["Once pinned, the file MUST return 200 forever — including after the item is withdrawn.",
              "Withdrawal endcaps (§9) MUST NOT be pinned",
              "No route ever serves an unpinned older version, in any representation"],
        spec_refs=["§4", "§8", "§8.4", "§9"], decisions=["#8", "#24", "#25"],
        clauses=["C-8-01", "C-8-02", "C-8-03", "C-4-09", "C-4-10", "C-8.4-01", "C-8.4-02"],
        pass_text=("Every served version is the live one or a pin; every pin stays pinned and served forever, through withdrawal and "
                   "return; no endcap is ever pinned. Honest caveat: with `served` defined as live ∪ pinned this is close to definitional — "
                   "what it really checks is that no event in the model (withdraw, republish, return) can remove a pin."),
        cex_text="Unexpected: a pin was lost or an endcap pinned.",
    ),
    dict(
        model="blygger", cmd="QuotedContentStillServedByItsAuthor",
        title="2b. Withdrawal does not reach other origins' baked quotes",
        expect="fail", cex_status="info", vacuity=None,
        spec=["Later edits, withdrawal, or pinning of a source do not change a thread's baked snapshot. Withdrawal does not cascade",
              "The protocol is honest that this is cooperation, not cryptography: remote copies, caches, and snapshots survive withdrawal."],
        spec_refs=["§9", "§10.4", "§13.4"], decisions=["#8", "#9", "#26"], clauses=["C-13.4-01"],
        pass_text="No counterexample in scope.",
        cex_text='One origin is enough: thread B v1 quotes A v1; A is then republished as v2 and v1 was never pinned. B keeps serving A v1\'s words, which A\'s own origin no longer serves anywhere. The same holds after withdrawal and across origins. The spec chose this (snapshot independence): "retention follows the origin\'s serving surface" (§13.4) binds readers\' stores, not other publishers\' baked HTML.',
    ),
    # ------------------------------------------------------------------ 3
    dict(
        model="blygger", cmd="ReaderNeverHoldsUnserved",
        title="3. Reader never holds unserved content past withdrawal (#18c)",
        expect="pass", cex_status="fail", vacuity="Vac_ReaderRetainsPin",
        spec=["Retention follows the origin's own serving surface: content corresponding to a version the origin has pinned … MAY be retained … Everything unpinned rolls to null.",
              "MUST treat a withdrawal endcap as roll-up-to-null (§13.4)."],
        spec_refs=["§13.1", "§13.4"], decisions=["#18"], clauses=["C-13.1-03", "C-13.4-01", "C-13.4-02", "C-13.1-01"],
        pass_text="After a reader has seen an item's endcap, whatever it still holds of that item is a pinned version its origin still serves.",
        cex_text="Unexpected: a reader retained an unpinned version past withdrawal.",
    ),
    dict(
        model="blygger", cmd="ReaderHoldsOnlyServed",
        title="3b. Between polls a reader may hold what the origin no longer serves",
        expect="fail", cex_status="info", vacuity=None,
        spec=["MUST treat item documents as ground truth and the feed as a lossy signal."],
        spec_refs=["§13.2", "§13.4"], decisions=["#18"], clauses=["C-13.1-01", "C-13.4-02"],
        pass_text="No counterexample in scope.",
        cex_text=("The origin republishes an item; a reader that has not polled yet still holds v1, which is no longer served. "
                  "Ordinary lag, not a violation — retention is bounded only at withdrawal. Shown because 6b/8 build on it: "
                  "a publisher's studio is such a reader, and what it bakes is what it holds."),
    ),
    # ------------------------------------------------------------------ 5
    dict(
        model="blygger", cmd="ForkFaithful",
        title="5 (a). ForkFaithful under §5.6 alone: a fork bakes what its source pin baked", rules="a",
        expect="fail", cex_status="warn", vacuity="Vac_ForkWithQuotes",
        spec=["A fork is a copy, not a transclusion: the forked content becomes the new item's own content_md … Readers MUST NOT infer that a fork still resembles its source.",
              "content_md keeps the directives … Republishing a thread re-resolves every directive to the then-current local snapshot."],
        spec_refs=["§5.6", "§10.2"], decisions=["#26", "#49"], clauses=["C-5.6-03", "C-5.6-06", "C-5.6-08", "C-10.2-01", "C-10.2-02"],
        pass_text="No counterexample in scope.",
        cex_text="Smallest case, one origin and no grammar issue at all: C v1 is published, B v1 quotes C v1, B v1 is pinned, C is republished as v2, then B v1 is forked as A. The fork copies B v1's content_md, the directive re-resolves to the current snapshot, and A v1 bakes C v2 — not the C v1 the pin shows. (This is the own-origin case Venkat reported before #57.) Across origins the same mechanism yields stale versions, unresolvable directives, and — see 5c — partial quotes turned whole. §5.6 does not promise faithfulness (r6: readers MUST NOT infer resemblance), so this is a gap, not a contradiction.",
        fable=("§5.6 r6 as normative text: a fork of a thread copies content_md, so its quotes re-resolve at the forker's studio and can name other versions, fail to resolve, or lose partiality (5 a, 5c a, 5e a). CLOSED by decision #57 / §16.6f once it enters §5.6 (5e b and 5f b hold); what #57 leaves open is 5g b."),
    ),
    dict(
        model="blygger", cmd="ForkSameTargets",
        title="5b (a). Weaker, §5.6 alone: a fork quotes the same items (ids) as its source pin", rules="a",
        expect="pass", cex_status="fail", vacuity="Vac_ForkWithQuotes",
        spec=["The directive names an identity, not an origin"],
        spec_refs=["§5.6", "§10.1", "§10.2"], decisions=["#26"], clauses=["C-10.2-01"],
        pass_text=("What the spec can guarantee: an unedited fork, if it publishes at all, quotes exactly the same items as its source pin. "
                   "Versions and partiality may differ (5, 5c); identity does not."),
        cex_text="Unexpected: a fork quotes a different item.",
    ),
    dict(
        model="blygger", cmd="ForkPreservesPartiality",
        title="5c (a). §5.6 alone: a partial quote stays partial in a fork (any client)", rules="a",
        expect="fail", cex_status="warn", vacuity="Vac_AwareForkOfPartial",
        spec=["A transclusion directive immediately followed, with no blank line, by a markdown blockquote is a partial transclusion",
              "a reader that ignores it [selector] entirely remains conformant, because readers display baked HTML and never resolve … which is why this entered the 0.3 text as a revision rather than opening 0.4"],
        spec_refs=["§10.1", "§10.3", "§16.4"], decisions=["#43", "#49"], clauses=["C-10.2-02", "C-10.3-01"],
        pass_text="No counterexample in scope.",
        cex_text='O2 publishes fragment B v1. O3 (partial-aware) imports it, publishes thread A v1 quoting one passage of B (partial), pins A v1. O2 — whose client predates the 2026-10-03 partial grammar — forks A v1. Its parser treats the attached blockquote as ordinary markdown: the fork C v1 bakes B v1 whole and carries the selection as unverified prose. #49 was admitted as a revision (not 0.4) under #43\'s test, "readers display baked HTML and never resolve" — true of readers, not of a forker that re-parses another origin\'s content_md.',
        fable=("#43/#49: the version-boundary test considers readers and receivers but not clients that re-parse another origin's content_md. Under §5.6 alone a forker does exactly that, and the 2026-10-03 partial grammar silently degrades to whole + an unverified blockquote on any client built before it (5c a). #57 removes the case for threads (a fork no longer re-parses directives), but the lesson stands for #43: any future grammar revision should ask \"does anything re-parse content_md written elsewhere?\" (forks of fragments today, any 0.4 import path tomorrow)."),
    ),
    dict(
        model="blygger", cmd="ForkPreservesPartialityIfAware",
        title="5d (a). §5.6 alone: …it does stay partial when the forker knows the grammar", rules="a",
        expect="pass", cex_status="fail", vacuity="Vac_AwareForkOfPartial",
        spec=["A directive with an attached blockquote (§10.1) resolves exactly as a whole directive — same order, same snapshot rule — and adds one check"],
        spec_refs=["§10.2"], decisions=["#49"], clauses=["C-10.2-02"],
        pass_text=("With a partial-aware forker, a partial quote in the source is partial in the fork (or the fork cannot publish because "
                   "the passage is gone from the forker's snapshot). So 5c's failure is exactly the grammar gap, nothing else."),
        cex_text="Unexpected: a partial-aware forker lost partiality.",
    ),
    # ------------------------------------------------------------------ 5 side by side
    dict(
        model="blygger", cmd="ForkTextEqualsPin_CopyMd", rules="a",
        title="5e (a). §5.6 alone: a fork's text equals its pinned source's text",
        expect="fail", cex_status="warn", vacuity="Vac_ForkWithQuotes",
        spec=["A fork is a copy, not a transclusion: the forked content becomes the new item's own content_md"],
        spec_refs=["§5.6", "§10.2"], decisions=["#26"], clauses=["C-5.6-03", "C-5.6-08", "C-10.2-01"],
        pass_text="No counterexample in scope.",
        cex_text='The grammar gap in the other direction: B v1 was written on a whole-only client (O1), so its attached blockquote rendered as an ordinary blockquote under a whole quote of C v1. A partial-aware client (O2) forks it: the same content_md now parses as a partial transclusion, and the fork shows only the selected passage instead of the whole of C. Copying content_md changes the text whenever forker and source differ in snapshots or grammar.',
    ),
    dict(
        model="blygger", cmd="ForkTextEqualsPin_57", rules="b",
        title="5e (b). §5.6 + §16.6f (#57): a fork's text equals its pinned source's text",
        expect="pass", cex_status="fail", vacuity="Vac_Fork57NestedRemotePartial",
        spec=["when the item named by forked_from is a thread, \"the forked content\" of §5.6 rule 6 is the pinned version's rendered document, flattened — not its content_md with the directives intact",
              "Each blyg-transclusion element in the pinned content_html replaces its directive as an ordinary markdown blockquote of that element's content, recursively"],
        spec_refs=["§5.6", "§16.6f"], decisions=["#57"], clauses=["C-5.6-03", "C-5.6-08"],
        pass_text=("The gap closes: under #57 every fork's text content equals its pinned source's, whatever the forker holds, whatever its "
                   "grammar, with nested and cross-origin quotes, and for a fork of a fork (whose flattened quotes are already own prose)."),
        cex_text="Unexpected: a #57 fork's text differs from its pin.",
    ),
    dict(
        model="blygger", cmd="ForkQuotesFaithful_57", rules="b",
        title="5f (b). #57: the fork's quoted text equals the pin's baked quote text, and nothing re-resolves",
        expect="pass", cex_status="fail", vacuity="Vac_Fork57NestedRemotePartial",
        spec=["The fork carries no transclusions[] entry and sends no transclusion mention for a quote it inherited",
              "A partial transclusion (blyg-partial) flattens the same way, from its baked paragraphs.",
              "The blyg-transclusion class MUST NOT survive into the fork"],
        spec_refs=["§16.6f", "§5.6", "§10.2"], decisions=["#57", "#49"], clauses=["C-5.6-08", "C-10.2-02"],
        pass_text=("Holds within scope: a #57 fork bakes nothing (no transclusions[], no quote-mentions, no blyg-transclusion), its flattened "
                   "blockquotes are exactly the pin's quote text (a partial keeps exactly its passage), and every quoted layer — nested and "
                   "cross-origin — gets an attribution line. The non-vacuity run exhibits a fork of a pin containing a partial quote and a "
                   "nested remote quote."),
        cex_text="Unexpected.",
    ),
    dict(
        model="blygger", cmd="ForkHonoursKnownWithdrawal_CopyMd", rules="a",
        title="5g (a). §5.6 alone: a fork never re-publishes words its forker knows were withdrawn (unpinned)",
        expect="pass", cex_status="fail", vacuity="Vac_ForkWithQuotes",
        spec=["A source that has since been withdrawn at its origin, and not pin-retained, is a publish error on republish",
              "The protocol does not offer \"freeze this quote at the withdrawn version\": that would be the first place withdrawal failed to roll to null"],
        spec_refs=["§10.2", "§13.4", "§5.6"], decisions=["#26", "#18"], clauses=["C-10.2-01", "C-13.4-01"],
        pass_text=("Holds: re-resolution refuses a directive whose source the forker knows is withdrawn and unpinned, so the fork cannot be "
                   "published with it (the author must remove the directive) — the same rule as republishing a thread."),
        cex_text="Unexpected.",
    ),
    dict(
        model="blygger", cmd="ForkHonoursKnownWithdrawal_57", rules="b",
        title="5g (b). #57: …and with flattening?",
        expect="fail", cex_status="warn", vacuity=None,
        spec=["The protocol does not offer \"freeze this quote at the withdrawn version\": that would be the first place withdrawal failed to roll to null, and it is deliberately not offered here.",
              "the source of quoted text is the pinned file's content_html, never the forker's local snapshots"],
        spec_refs=["§16.6f", "§10.2", "§13.4"], decisions=["#57", "#26", "#18"], clauses=["C-13.4-01", "C-10.2-01"],
        pass_text="No counterexample in scope.",
        cex_text='One origin: C v1 is published, thread A v1 quotes it, A v1 is pinned, C is withdrawn (never pinned). A v1 is then forked as B (by the same origin here; any origin works). Under #57 the fork is A v1\'s baked HTML flattened, so C\'s withdrawn, unpinned words are published afresh under a new id as an ordinary blockquote — although the forker knows C is withdrawn, and although the same publisher could not republish a thread of its own quoting C (publish error, §10.2). Under §5.6 alone (5g a) this cannot happen. Defensible — the pin of A already serves those words forever, the ground on which #57 rejected pin-closure — but it is the "freeze this quote at the withdrawn version" §10.2 says is deliberately not offered, now available through fork.',
        fable=("§16.6f (#57) and §10.2: flattening makes a fork the one way to re-publish, under a new id and a new publisher, the words of a "
               "quoted item that its author withdrew and never pinned, even when the forker's own store has rolled it up to null (5g b). "
               "§10.2 says this is \"deliberately not offered\" for republish. Either accept it explicitly in §16.6f (the pinned thread already "
               "serves those bytes forever, so the fork exposes nothing new — the reason pin-closure was rejected), or say a forker SHOULD "
               "drop or mark a flattened quote whose source it knows is withdrawn and unpinned."),
    ),
    # ------------------------------------------------------------------ 6
    dict(
        model="blygger", cmd="QuoteIsVerbatim",
        title="6a. Every partial quote was a substring of the version it names",
        expect="pass", cex_status="fail", vacuity="Vac_PartialQuote",
        spec=["at publish, the selection MUST be a substring of the target snapshot's text content … at the version being baked; otherwise a publish error"],
        spec_refs=["§10.2"], decisions=["#49"], clauses=["C-10.2-02", "C-10.3-01"],
        pass_text=("Holds — including through nesting: a selection may come from a whole quote nested inside the target, or from a partial "
                   "quote inside it. (Substring is abstracted as passage membership, which is generous: a real substring test is stricter.)"),
        cex_text="Unexpected: a published partial quote is not in its target.",
    ),
    dict(
        model="blygger", cmd="QuoteCheckableAtPublish",
        title="6b. Is a partial quote re-checkable at the moment it is published?",
        expect="fail", cex_status="fail", vacuity="Vac_PartialQuote",
        spec=["Any reader MAY re-check by the same test while the origin serves that version, live or pinned."],
        spec_refs=["§10.2", "§5.9"], decisions=["#26", "#49"], clauses=["C-10.2-03", "C-10.2-02"],
        pass_text="No counterexample in scope.",
        cex_text='O1 publishes B v1. O2 imports it. O1 republishes B as v2 (v1 never pinned). O2, not having polled since, publishes thread A partially quoting B v1 — the substring check passes against O2\'s local snapshot, exactly as the spec requires. But O1 no longer serves v1 anywhere: the "any reader MAY re-check" window is empty from the moment the quote exists. Publish-from-local-snapshot (#26) and re-checkability (#49) coincide only when the quoted version is live or pinned at publish.',
        fable=("§10.2 / #49: a partial quote is checked against the publisher's local snapshot, which may already be unserved (stale import, "
               "unpinned) — so the faithfulness the selector promises can be uncheckable by anyone from birth (6b), and becomes so for every "
               "unpinned target on its next republish (6c). The spec's own mitigation (\"quote pinned versions\") is stated for withdrawal; "
               "consider stating it for partial quotes too, e.g. a studio SHOULD warn when a partial quote's version is not pinned, or SHOULD "
               "refresh the import before baking a partial quote."),
    ),
    dict(
        model="blygger", cmd="QuoteStaysCheckable",
        title="6c. Does a partial quote stay re-checkable?",
        expect="fail", cex_status="warn", vacuity="Vac_PartialQuote",
        spec=["Any reader MAY re-check by the same test while the origin serves that version, live or pinned.",
              "No auto-pin: transclusions[].version is provenance metadata and may name a version with no fetchable per-version file."],
        spec_refs=["§10.2", "§10.4"], decisions=["#49", "#9"], clauses=["C-10.2-03"],
        pass_text="No counterexample in scope.",
        cex_text='A v1 partially quotes B v1 while v1 is live; B is then withdrawn (or republished) without v1 ever being pinned. From then on no reader can re-check the quote. The spec says this in so many words ("while the origin serves that version"), so it is not a contradiction — but a quote\'s verifiability is in the hands of the quoted author, not the quoter.',
    ),
    # ------------------------------------------------------------------ 8
    dict(
        model="blygger", cmd="StubVersionAgreement",
        title="8a. Stub version agreement (#27)",
        expect="pass", cex_status="fail", vacuity="Vac_StubQuotingTarget",
        spec=["At publish, if the body transcludes the stub's target, stub_of.version MUST equal the version actually baked (§10.3); otherwise it keeps the value set when the stub was created — what the author saw. The two can never disagree on a published document."],
        spec_refs=["§10.6", "§10.3"], decisions=["#27"], clauses=["C-10.6-03", "C-10.6-01", "C-10.6-02"],
        pass_text=("Holds, including with two directives naming the target (both resolve to the same local snapshot) and with partial quotes. "
                   "Near-definitional: the rule is encoded as a fact, so this mainly shows the rule is consistent with resolution."),
        cex_text="Unexpected: a stub disagrees with what it baked.",
    ),
    dict(
        model="blygger", cmd="StubCiteNeverRegresses",
        title="8b. A stub's stub_of.version never moves backwards across the stub's versions",
        expect="fail", cex_status="warn", vacuity="Vac_StubQuotingTarget",
        spec=["otherwise it keeps the value set when the stub was created — what the author saw."],
        spec_refs=["§10.6"], decisions=["#27"], clauses=["C-10.6-03"],
        pass_text="No counterexample in scope.",
        cex_text='One origin. A v1, then A v2. The author started stub B while A v1 was current (creation value: v1), and publishes B v1 quoting A — agreement sets stub_of to the baked A v2. B is republished as v2 with the quote removed: read literally, r3 says stub_of "keeps the value set when the stub was created", so it falls back to A v1 — below a version the stub itself baked, and a staleness check now reports more staleness than is true.',
        fable=("§10.6 r3: \"otherwise it keeps the value set when the stub was created\" — read literally, removing a quote of the target makes "
               "stub_of.version fall back to the creation-time version, below a version the stub itself previously baked (8b). Probably "
               "intended: \"keeps its previous value\" (the last version the stub named)."),
    ),
    dict(
        model="blygger", cmd="StubCitesRealVersion",
        title="8c. A stub names a version its target's origin really published",
        expect="pass", cex_status="fail", vacuity="Vac_StubQuotingTarget",
        spec=["version is the version the publisher actually saw and, for a transclusion, actually baked."],
        spec_refs=["§5.9", "§10.6"], decisions=["#27"], clauses=["C-10.6-03"],
        pass_text="Holds: every stub_of names a version that was published at its origin (it came from the stubber's own reading).",
        cex_text="Unexpected.",
    ),
    dict(
        model="blygger", cmd="VersionsContiguous",
        title="Versions increment by exactly 1 per publish event (#19)",
        expect="pass", cex_status="fail", vacuity="Vac_Republish",
        spec=["version is a positive integer, incremented by exactly 1 per publish event."],
        spec_refs=["§5.2", "§9"], decisions=["#19"], clauses=["C-5.1-02"],
        pass_text="Across publish, republish, withdrawal endcaps and returns, each item's published versions are exactly 1..n.",
        cex_text="Unexpected.",
    ),
    # ------------------------------------------------------------------ 4 watermark
    dict(
        model="watermark", cmd="WatermarkMonotone",
        title="4. Watermark is monotone except by user reset (#18b)",
        expect="pass", cex_status="fail", vacuity="Vac_RewriteCaught",
        spec=["A fetched document whose version is lower than the watermark … The reader MUST NOT silently adopt it, SHOULD surface the discrepancy, and MAY offer a user-confirmed reset to origin state."],
        spec_refs=["§13.3"], decisions=["#18"], clauses=["C-13.3-01", "C-13.3-02", "C-13.1-02", "C-13.2-02"],
        pass_text=("With the watermark kept across roll-up-to-null, it never decreases except by a user-confirmed reset — under any poll "
                   "order, dropped feed entries, stale cached bodies, stealth edits and history rewrites."),
        cex_text="Unexpected.",
    ),
    dict(
        model="watermark", cmd="NoSilentRegression",
        title="4b. No silent regression of presented content (keep-watermark reading)",
        expect="pass", cex_status="fail", vacuity="Vac_StaleThenFresh",
        spec=["Without this rule, a compromised or rolled-back origin memory-holes its own edit history invisibly; with it, history rewriting is at least loud."],
        spec_refs=["§13.3"], decisions=["#18"], clauses=["C-13.3-01"],
        pass_text="The reader never presents content older than the newest version it adopted unless the user reset.",
        cex_text="Unexpected.",
    ),
    dict(
        model="watermark", cmd="NoSilentRegression_Forget",
        title="4c. …but if the watermark is deleted with the stored copy on withdrawal",
        expect="fail", cex_status="warn", vacuity=None,
        spec=["On a withdrawal endcap, a conforming reader rolls the item up to null: it MUST stop presenting the withdrawn content as live and SHOULD delete its stored copy",
              "Conforming readers roll the item up to null and drop it from their local archive (§13.4)."],
        spec_refs=["§9", "§13.3", "§13.4"], decisions=["#18"], clauses=["C-13.4-01", "C-13.3-01", "C-13.1-03"],
        pass_text="No counterexample in scope.",
        cex_text='The origin publishes v1, then withdraws (v2 endcap). The reader fetches the endcap and — following "SHOULD delete its stored copy" / "drop it from the local archive" — forgets the item, watermark included. A stale cache then replays the v1 body (an origin rolling back would do the same). With no watermark the reader has no record and adopts v1 as the item returning: withdrawn content comes back silently. No rewrite by the origin was even needed. The spec never says the watermark outlives the stored copy.',
        fable=("§13.3/§13.4: say explicitly that the per-item watermark survives roll-up-to-null (deleting the stored copy must not delete "
               "the highest version seen). Otherwise withdraw-then-roll-back memory-holes history exactly as §13.3 says it must not (4c)."),
    ),
    dict(
        model="watermark", cmd="WatermarkMonotone_Forget",
        title="4d. Watermark monotone under the forget-on-delete reading",
        expect="fail", cex_status="info", vacuity=None,
        spec=["SHOULD delete its stored copy"],
        spec_refs=["§13.4"], decisions=["#18"], clauses=["C-13.4-01"],
        pass_text="No counterexample in scope.",
        cex_text="By construction of the reading: deleting the record on an endcap drops the watermark to zero. See 4c for why it matters.",
    ),
    dict(
        model="watermark", cmd="RewriteIsLoud",
        title="4e. A fetched history rewrite always raises a discrepancy",
        expect="pass", cex_status="fail", vacuity="Vac_ResetUsed",
        spec=["history rewriting is at least loud"],
        spec_refs=["§13.3"], decisions=["#18"], clauses=["C-13.3-01"],
        pass_text="Whenever the reader fetches a rewritten body below its watermark, it surfaces it.",
        cex_text="Unexpected.",
    ),
    dict(
        model="watermark", cmd="AlarmMeansRewrite",
        title="4f. Does a lower-version alarm prove the origin rewrote history?",
        expect="fail", cex_status="info", vacuity=None,
        spec=["A fetched document whose version is lower than the watermark is a protocol violation by the origin"],
        spec_refs=["§13.3", "§12.3"], decisions=["#18"], clauses=["C-13.3-01"],
        pass_text="No counterexample in scope.",
        cex_text="No. The origin publishes v1 and withdraws it (v2 endcap); the reader adopts the endcap; a stale edge cache then returns the v1 body. The reader raises the history-rewrite alarm though the origin never rewrote anything. §13.3 does call a lower version the origin's violation (it served an old body), so this is a calibration note, not a bug: surfaced discrepancies will include cache artefacts.",
    ),
    dict(
        model="watermark", cmd="EndcapRollsUpToNull",
        title="4g. A fetched endcap rolls the item up to null",
        expect="pass", cex_status="fail", vacuity="Vac_StaleThenFresh",
        spec=["MUST treat a withdrawal endcap as roll-up-to-null (§13.4)."],
        spec_refs=["§13.1", "§13.4"], decisions=["#18"], clauses=["C-13.1-03", "C-13.4-01"],
        pass_text="Holds.",
        cex_text="Unexpected.",
    ),
    # ------------------------------------------------------------------ 7 mentions
    dict(
        model="mentions", cmd="ImpostorFails",
        title="7. ImpostorFails: verification attributes a mention to the origin that served it",
        expect="fail", cex_status="fail", vacuity="Vac_VerifiedStub",
        spec=["The document's origin MUST equal the final source URL's origin (scheme, host, port; trailing slash normalized) … it is what stops a mirror or an impostor from speaking in a real blyg's name.",
              "a blyg's origin is any absolute base URL — domain root, any path, any subdomain"],
        spec_refs=["§15.4", "§12.2", "§4"], decisions=["#14", "#17", "#28", "#36"],
        clauses=["C-15.4-03", "C-15.4-02", "C-13.1-07", "C-4-01"],
        pass_text="No counterexample in scope.",
        cex_text=("Two blygs share a host, path-mounted: example.com/alice/ and example.com/bob/ (#14 allows it; #36 recommends exactly this "
                  "\"N origins under one host\" shape for groups). Bob serves, inside his own mount, an item document whose \"origin\" is "
                  "example.com/alice/ and whose stub_of names a target at a third blyg, then sends that blyg a Webmention with his URL as source. "
                  "Step 2 compares scheme, host and port only — they match — so the mention verifies and is recorded as Alice's stub. "
                  "Bob can speak in Alice's name to any receiver."),
        fable=("§15.4 step 2 compares the document's origin with the source URL's (scheme, host, port), but identity origins are full base URLs "
               "with paths (§4, #14) and §12.2 identity is \"the URL the manifest was fetched from, minus blyg.json\". Co-hosted path-mounted "
               "blygs (#36's group shape) can impersonate each other's mentions (7). Fix that the model confirms (7c): the source URL must lie "
               "inside the claimed origin — a path-prefix match on the full origin, not a host match. §15.3's target check has the same "
               "scheme/host/port shape and should be read the same way."),
    ),
    dict(
        model="mentions", cmd="ImpostorFails_OneOriginPerHost",
        title="7b. ImpostorFails when every host has one blyg (today's deployments)",
        expect="pass", cex_status="fail", vacuity="Vac_VerifiedStub",
        spec=["A page on one host pointing at a document claiming another origin does not verify."],
        spec_refs=["§15.4"], decisions=["#17", "#28"], clauses=["C-15.4-03"],
        pass_text=("A mirror on another host that copies a real blyg's documents byte-for-byte cannot get a mention verified in that blyg's "
                   "name. (Premise: one origin per host, and the host has one operator.)"),
        cex_text="Unexpected.",
    ),
    dict(
        model="mentions", cmd="ImpostorFails_PathAware",
        title="7c. ImpostorFails with a path-aware step 2 (proposed fix)",
        expect="pass", cex_status="fail", vacuity="Vac_PathAwareVerified",
        spec=["(proposed) the source URL must lie inside the document's claimed origin"],
        spec_refs=["§15.4"], decisions=["#14", "#28"], clauses=["C-15.4-03"],
        pass_text="With a full-origin prefix match the impostor in 7 no longer verifies, even with co-hosted origins.",
        cex_text="Unexpected.",
    ),
    dict(
        model="mentions", cmd="WithdrawnStubStopsVerifying",
        title="7d. A withdrawn stub stops verifying as a stub",
        expect="fail", cex_status="warn", vacuity="Vac_ViaLiveVerified",
        spec=["A withdrawn stub stops verifying as a stub, because its endcap omits stub_of",
              "If the response is JSON with a blyg key, it is the item document.",
              "a pinned version of a stub carries the stub_of it was published with"],
        spec_refs=["§9", "§15.4", "§8"], decisions=["#8", "#27", "#28"], clauses=["C-9-01", "C-15.4-02", "C-15.4-04"],
        pass_text="No counterexample in scope.",
        cex_text=("A stub is pinned at v1, then withdrawn. Anyone sends the target a Webmention whose source is the pin file "
                  "items/{id}/v1.json (or a pinned page that links it). It is JSON with a blyg key, its origin matches, its kind is "
                  "thread and it carries stub_of: it verifies as a stub, although the item is withdrawn."),
        fable=("§9/§15.4: \"a withdrawn stub stops verifying\" holds only for the live document. A pinned version file is \"JSON with a blyg key\" "
               "and carries stub_of (§8 r5), so a mention whose source is a pin keeps verifying after withdrawal (7d). Decide which is "
               "intended: either verification reads {origin}items/{id}.json for the document's id (7e shows this closes it), or a pinned stub "
               "remaining a verifiable response is deliberate and §9's sentence should say \"the live document stops verifying\"."),
    ),
    dict(
        model="mentions", cmd="WithdrawnStubStopsVerifying_ViaLive",
        title="7e. …it does if verification re-reads the live item document (proposed fix)",
        expect="pass", cex_status="fail", vacuity="Vac_ViaLiveVerified",
        spec=["(proposed) steps 3–4 are tested against {origin}items/{id}.json"],
        spec_refs=["§15.4"], decisions=["#28"], clauses=["C-9-01"],
        pass_text="Holds.",
        cex_text="Unexpected.",
    ),
    dict(
        model="mentions", cmd="MirrorCannotTakeIdentity",
        title="7f. A mirror cannot become the subscription identity of what it copies (#17)",
        expect="pass", cex_status="fail", vacuity="Vac_MirrorSubscription",
        spec=["Subscription identity is the final fetch origin … The manifest's self-asserted site is display-advisory only … MUST NOT adopt the asserted value as identity"],
        spec_refs=["§12.2"], decisions=["#17"], clauses=["C-12.2-01", "C-12.2-02"],
        pass_text="Identity is always where the manifest bytes came from (after redirects); a self-asserted site never becomes identity.",
        cex_text="Unexpected.",
    ),
]

MODELS = {
    "blygger": "Publication, pins, withdrawal, import, transclusion (whole/partial), forks, stubs — Alloy 6 temporal model",
    "watermark": "One reader, one imported item: the version watermark against rewrites, stale caches and withdrawal — temporal",
    "mentions": "Origin identity and Webmention structural verification — static model, adversarial publisher",
}
