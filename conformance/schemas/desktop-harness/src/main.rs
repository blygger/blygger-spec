//! Conformance harness for blygger-desktop ("Burrow").
//!
//!   blyg-conformance-harness grammar <input.json>   # grammar corpus through blyg-render
//!   blyg-conformance-harness docs <input.json>      # item documents through blyg-core's ItemDoc
//!
//! Input and output are JSON on stdin-file / stdout; the Node runner prepares
//! the input and interprets the output.

use std::collections::HashMap;

use blyg_core::api::public::ItemDoc;
use blyg_render::{
    Found, ItemKind, Kind, RenderOpts, Resolution, Resolver, parse_scopes, render_preview,
};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
struct Target {
    id: String,
    origin: Option<String>,
    version: u32,
    kind: String,
    content_html: String,
    page: Option<String>,
}

#[derive(Deserialize)]
struct Case {
    id: String,
    content_md: String,
}

#[derive(Deserialize)]
struct GrammarInput {
    targets: Vec<Target>,
    cases: Vec<Case>,
}

struct MapResolver(HashMap<String, Found>);

impl Resolver for MapResolver {
    fn resolve(&self, id: &str) -> Resolution {
        match self.0.get(id) {
            Some(f) => Resolution::Found(f.clone()),
            None => Resolution::NotFound,
        }
    }
}

fn grammar(input: GrammarInput) -> Value {
    let map = input
        .targets
        .into_iter()
        .map(|t| {
            let f = Found {
                origin: t.origin,
                id: t.id.clone(),
                version: t.version,
                kind: if t.kind == "thread" { ItemKind::Thread } else { ItemKind::Fragment },
                content_html: t.content_html,
                author: None,
                page: t.page,
            };
            (t.id, f)
        })
        .collect();
    let resolver = MapResolver(map);
    let opts = RenderOpts {
        data_line: false,
        provenance: false,
        mount: "https://desktop.example".into(),
        self_id: None,
    };
    let results: Vec<Value> = input
        .cases
        .iter()
        .map(|c| {
            let r = render_preview(&c.content_md, Kind::Thread, &resolver, &opts);
            let (scopes, tk_errors) = parse_scopes(&c.content_md);
            json!({
                "id": c.id,
                "html": r.html,
                "transclusions": r.stats.transclusions.iter().map(|q| json!({
                    "id": q.id, "version": q.version, "origin": q.origin,
                    "partial": q.selector.is_some(),
                    "exact": q.selector.as_ref().map(|s| s.exact.clone()),
                })).collect::<Vec<_>>(),
                "unresolved": r.stats.unresolved.iter().map(|u| json!({"directive": u.directive, "reason": u.reason.to_string()})).collect::<Vec<_>>(),
                "links": r.stats.links,
                "tk_sources": scopes.iter().map(|s| s.source_ids.clone()).collect::<Vec<_>>(),
                "tk_errors": tk_errors.iter().map(|e| e.reason.clone()).collect::<Vec<_>>(),
            })
        })
        .collect();
    json!({ "results": results })
}

#[derive(Deserialize)]
struct DocIn {
    path: String,
    origin: String,
    id: String,
    json: String,
}

fn docs(input: Vec<DocIn>) -> Value {
    let out: Vec<Value> = input
        .iter()
        .map(|d| match serde_json::from_str::<ItemDoc>(&d.json) {
            Ok(doc) => json!({
                "path": d.path,
                "ok": true,
                "reading_item": serde_json::to_value(doc.reading_item(&d.origin, &d.id)).unwrap_or(Value::Null),
                "lineage": serde_json::to_value(doc.lineage()).unwrap_or(Value::Null),
                "versions": doc.versions().iter().map(|v| json!({"version": v.version, "at": v.at, "note": v.note, "pinned": v.pinned})).collect::<Vec<_>>(),
            }),
            Err(e) => json!({ "path": d.path, "ok": false, "error": e.to_string() }),
        })
        .collect();
    json!({ "results": out })
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let mode = args.get(1).map(String::as_str).unwrap_or("");
    let path = args.get(2).expect("input file");
    let raw = std::fs::read_to_string(path).expect("read input");
    let out = match mode {
        "grammar" => grammar(serde_json::from_str(&raw).expect("grammar input")),
        "docs" => docs(serde_json::from_str(&raw).expect("docs input")),
        _ => panic!("mode must be grammar|docs"),
    };
    println!("{}", serde_json::to_string_pretty(&out).unwrap());
}
