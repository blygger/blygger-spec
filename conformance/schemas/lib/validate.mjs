// Schema layer: compiles the normative schemas (MUST → fail) and the advisory
// layer (SHOULD/RECOMMENDED → warn), per decision #48.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (n) => JSON.parse(readFileSync(join(here, "..", "schemas", n), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const n of ["defs", "item", "pinned", "manifest", "index", "advisory"]) ajv.addSchema(load(`${n}.schema.json`));

const base = "https://blygger.org/conformance/0.3/";
const normative = {
  item: ajv.getSchema(base + "item.schema.json"),
  pinned: ajv.getSchema(base + "pinned.schema.json"),
  manifest: ajv.getSchema(base + "manifest.schema.json"),
  index: ajv.getSchema(base + "index.schema.json"),
};
const advisory = {
  item: ajv.getSchema(base + "advisory.schema.json#/$defs/item"),
  pinned: ajv.getSchema(base + "advisory.schema.json#/$defs/pinned"),
  manifest: ajv.getSchema(base + "advisory.schema.json#/$defs/manifest"),
};

function fmt(errors, schemaRoot) {
  // Drop the noisy if/then/oneOf wrappers; keep leaf errors.
  return (errors || [])
    .filter((e) => !["if", "allOf", "anyOf"].includes(e.keyword))
    .map((e) => ({
      path: e.instancePath || "/",
      message: `${e.message}${e.params && e.params.allowedValue !== undefined ? ` (${JSON.stringify(e.params.allowedValue)})` : ""}${e.params && e.params.missingProperty ? `: ${e.params.missingProperty}` : ""}${e.params && e.params.additionalProperty ? `: ${e.params.additionalProperty}` : ""}`,
      schema: `${schemaRoot}${e.schemaPath}`,
    }));
}

/** Validate one document; returns {fail:[...], warn:[...]} of {path,message,schema}. */
export function validateDoc(type, doc) {
  const v = normative[type];
  const ok = v(doc);
  const fail = ok ? [] : fmt(v.errors, `${type}.schema.json`);
  const a = advisory[type];
  let warn = [];
  if (a && !a(doc)) warn = fmt(a.errors, `advisory.schema.json#/$defs/${type}`);
  return { fail, warn };
}

export const schemaFiles = ["defs", "item", "pinned", "manifest", "index", "advisory"].map((n) => `${n}.schema.json`);
export const loadSchema = load;
