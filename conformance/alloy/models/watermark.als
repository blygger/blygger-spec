/*
 * watermark.als — the reader's version watermark (§13.3, decision #18b) and
 * roll-up-to-null on withdrawal (§13.4, #18c), for ONE imported item.
 *
 * The origin is adversarial in exactly the ways §13.3 anticipates: it can
 * publish (+1), and it can rewrite history (serve a lower version — a
 * rollback or a compromise). The network is adversarial in the ways §13.2
 * anticipates: feed entries are dropped (the reader simply does not fetch
 * for a while), polls happen in any order, and a fetch may return ANY body
 * the origin has ever served (a stale edge cache, a lagging replica).
 *
 * The reader implements §13.3 literally:
 *   - version > watermark  : adopt, raise the watermark;
 *   - version = watermark  : adopt content (a stealth edit), watermark same
 *                            [C-13.3-02];
 *   - version < watermark  : "MUST NOT silently adopt it, SHOULD surface the
 *                            discrepancy, and MAY offer a user-confirmed
 *                            reset" [C-13.3-01].
 * and §13.4: on an endcap it "rolls the item up to null ... and SHOULD
 * delete its stored copy" [C-13.4-01, C-13.1-03].
 *
 * READING (the point of this file): §13.4 says to delete the stored copy
 * and §9 says readers "drop it from their local archive". Neither says
 * whether the WATERMARK survives the deletion. Both readings are modelled
 * as a reader policy: KeepWatermark and ForgetOnDelete.
 */
module watermark

abstract sig Kind {}
one sig Content, Endcap extends Kind {}

-- One body of the item document, as the origin served it at some moment.
sig Doc { ver: one Int, kind: one Kind }

abstract sig Policy {}
one sig KeepWatermark, ForgetOnDelete extends Policy {}

one sig Origin {
  var current: lone Doc,       -- what items/{id}.json says right now
  var everServed: set Doc      -- every body it has ever served (caches can replay any)
}

-- Ghost state: has the origin ever rewritten history?
var sig Rewrites in Doc {}

one sig Reader {
  policy: one Policy,
  var watermark: one Int,      -- 0 = never seen (or forgotten)
  var stored: lone Doc,        -- the copy it holds; none = rolled up to null
  var alarm: lone Doc,         -- a surfaced, unresolved discrepancy
  var hi: one Int              -- ghost: highest version adopted, lowered only by reset
}

fact docsWellFormed { all d: Doc | d.ver > 0 }

fact init {
  no Origin.current and no Origin.everServed and no Rewrites
  Reader.watermark = 0 and no Reader.stored and no Reader.alarm and Reader.hi = 0
}

pred readerFrame { Reader.watermark' = Reader.watermark and Reader.stored' = Reader.stored
                   and Reader.alarm' = Reader.alarm and Reader.hi' = Reader.hi }
pred originFrame { Origin.current' = Origin.current and Origin.everServed' = Origin.everServed
                   and Rewrites' = Rewrites }

-- §5.2 "incremented by exactly 1 per publish event" (#19). An endcap (§9)
-- is a publish event too; a return after withdrawal is a content version.
pred publish[d: Doc] {
  d not in Origin.everServed
  d.ver = (no Origin.current => 1 else plus[Origin.current.ver, 1])
  d.kind = Endcap => (some Origin.current and Origin.current.kind = Content)
  Origin.current' = d
  Origin.everServed' = Origin.everServed + d
  Rewrites' = Rewrites
  readerFrame
}

-- A history rewrite: the origin starts serving a LOWER version (§13.3:
-- "a compromised or rolled-back origin").
pred rewrite[d: Doc] {
  d not in Origin.everServed
  some Origin.current
  d.ver < Origin.current.ver
  d.kind = Content
  Origin.current' = d
  Origin.everServed' = Origin.everServed + d
  Rewrites' = Rewrites + d
  readerFrame
}

-- §13.2: "only the fetched document advances state". The body returned may
-- be any body ever served — fresh or stale.
pred fetch[d: Doc] {
  d in Origin.everServed
  originFrame
  let w = Reader.watermark {
    d.ver > w => {
      Reader.alarm' = Reader.alarm
      -- ghost: the highest version this reader has ever adopted
      Reader.hi' = (d.ver > Reader.hi => d.ver else Reader.hi)
      d.kind = Content => (Reader.stored' = d and Reader.watermark' = d.ver)
      else {
        Reader.stored' = none
        -- the reading in question
        Reader.policy = KeepWatermark => Reader.watermark' = d.ver
                                      else Reader.watermark' = 0
      }
    }
    d.ver = w => {
      -- stealth edit / same version: content ground truth wins, watermark same
      Reader.watermark' = w and Reader.alarm' = Reader.alarm and Reader.hi' = Reader.hi
      d.kind = Content => Reader.stored' = d else Reader.stored' = none
    }
    d.ver < w => {
      -- "MUST NOT silently adopt it, SHOULD surface the discrepancy"
      Reader.watermark' = w and Reader.stored' = Reader.stored
      Reader.alarm' = d and Reader.hi' = Reader.hi
    }
  }
}

-- "MAY offer a user-confirmed reset to origin state."
pred reset {
  some Reader.alarm
  originFrame
  Reader.watermark' = Reader.alarm.ver
  Reader.stored' = (Reader.alarm.kind = Content => Reader.alarm else none)
  Reader.alarm' = none
  Reader.hi' = Reader.alarm.ver
}

pred skip { originFrame and readerFrame }

fact traces { always (skip or reset or (some d: Doc | publish[d] or rewrite[d] or fetch[d])) }

------------------------------------------------------------------------
-- Assertions
------------------------------------------------------------------------

-- W1: under KeepWatermark, the watermark never decreases except by a
-- user-confirmed reset, whatever the poll order, drops, stale caches or
-- rewrites. [C-13.3-01]
assert WatermarkMonotone {
  Reader.policy = KeepWatermark =>
    always (not reset => Reader.watermark' >= Reader.watermark)
}

-- W1': the same under ForgetOnDelete. Expected: FAILS (by definition of
-- the policy; the interesting consequence is W2').
assert WatermarkMonotone_Forget {
  Reader.policy = ForgetOnDelete =>
    always (not reset => Reader.watermark' >= Reader.watermark)
}

-- W2: the reader never presents content older than the newest version it
-- has adopted, unless the user reset. "history rewriting is at least loud".
assert NoSilentRegression {
  Reader.policy = KeepWatermark =>
    always (some Reader.stored => Reader.stored.ver >= Reader.hi)
}

-- W2': the same under ForgetOnDelete. Expected: FAILS — withdraw, forget,
-- then the origin rolls back (or a cache replays) an older version, and the
-- reader adopts it silently as "the item returning".
assert NoSilentRegression_Forget {
  Reader.policy = ForgetOnDelete =>
    always (some Reader.stored => Reader.stored.ver >= Reader.hi)
}

-- W3: a rewrite the reader fetches is never adopted silently (KeepWatermark).
assert RewriteIsLoud {
  Reader.policy = KeepWatermark =>
    always all d: Rewrites | fetch[d] and d.ver < Reader.watermark => Reader.alarm' = d
}

-- W4: an alarm means the origin really rewrote history. Expected: FAILS —
-- a stale cache replaying an old body raises the same alarm.
assert AlarmMeansRewrite {
  always (some Reader.alarm => some Rewrites)
}

-- W5: after a withdrawal is fetched, nothing is stored. [C-13.4-01]
assert EndcapRollsUpToNull {
  always all d: Doc | (fetch[d] and d.kind = Endcap and d.ver > Reader.watermark) => no Reader.stored'
}

check WatermarkMonotone for 6 Doc, 4 Int, 1..10 steps
check WatermarkMonotone_Forget for 6 Doc, 4 Int, 1..10 steps
check NoSilentRegression for 6 Doc, 4 Int, 1..10 steps
check NoSilentRegression_Forget for 6 Doc, 4 Int, 1..10 steps
check RewriteIsLoud for 6 Doc, 4 Int, 1..10 steps
check AlarmMeansRewrite for 6 Doc, 4 Int, 1..10 steps
check EndcapRollsUpToNull for 6 Doc, 4 Int, 1..10 steps

run Vac_RewriteCaught { Reader.policy = KeepWatermark
  eventually (some Reader.alarm and some Rewrites) } for 6 Doc, 4 Int, 1..8 steps
run Vac_StaleThenFresh { Reader.policy = KeepWatermark
  eventually (some Reader.stored and Reader.stored.ver = 3) } for 6 Doc, 4 Int, 1..8 steps
run Vac_ResetUsed { Reader.policy = KeepWatermark
  eventually (reset and some Rewrites) } for 6 Doc, 4 Int, 1..8 steps
