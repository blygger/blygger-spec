-- TK-core: instructed generation. See docs/tk-core-plan.md §5, decision #20.
-- generated_json: per-published-version wire provenance (item doc "generated" key).
ALTER TABLE versions ADD COLUMN generated_json TEXT;
-- tk_provenance_json: working-copy-side cache of per-scope generation
-- provenance (sources/model/at), positionally aligned to scope order as of
-- the last /generate call — not itself a wire artifact. See model.ts.
ALTER TABLE items ADD COLUMN tk_provenance_json TEXT;
