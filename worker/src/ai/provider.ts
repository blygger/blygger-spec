// TK generation provider interface — tk-core-plan.md §4. One interface for
// every present and future generation hook (fragment editor, thread editor,
// later import-pipeline filters). Reference implementation targets the
// Anthropic Messages API via raw HTTP: this is a Cloudflare Worker with no
// nodejs_compat flag and a deliberately small dependency set (hono,
// markdown-it, fast-xml-parser — see package.json), so a raw `fetch` call
// against the wire API is the natural fit here, not the Node-oriented
// `@anthropic-ai/sdk`.

import { getSettings } from "../model.ts";
import type { Env } from "../types.ts";

export interface GenerateRequest {
  instruction: string;
  /** Span's current output, if regenerating; null for a first generation. */
  currentText: string | null;
  sources: { id: string; content_md: string }[];
  /** Full working copy, with the active scope marked by SCOPE_MARK_START/END. */
  documentContext: string;
  stylePrompt: string | null;
}

export interface GenerateResult {
  text: string;
  model: string;
}

/** Marks the active scope's position within `documentContext` for the model. */
export const SCOPE_MARK_START = "<<<TK-SCOPE>>>";
export const SCOPE_MARK_END = "<<<END-TK-SCOPE>>>";

/** Thrown on any provider failure — surfaced verbatim by the /generate endpoint, no retry loop (§5). */
export class ProviderError extends Error {}

/** Wrap `[start, end)` of `contentMd` with the scope markers, for `documentContext`. */
export function markDocument(contentMd: string, start: number, end: number): string {
  return contentMd.slice(0, start) + SCOPE_MARK_START + contentMd.slice(start, end) + SCOPE_MARK_END + contentMd.slice(end);
}

/**
 * Injectable HTTP call, mirroring importer/http.ts's FetchLike DI pattern —
 * decouples request-shape/error-surfacing tests from a real network layer.
 */
export type ProviderFetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export const platformProviderFetch: ProviderFetchLike = (url, init) => fetch(url, init);

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
/** Skill-mandated default (claude-api skill, 2026-08): use unless the settings override it. */
const DEFAULT_MODEL = "claude-opus-5";
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT =
  "You are the generation engine behind a TK (\"to come\") instructed-generation " +
  "feature in a writing tool. The author has marked a span of their draft with an " +
  "instruction; you write the prose that replaces it. Output ONLY the replacement " +
  "text: no preamble, no meta-commentary, no code fences, no explanation of what " +
  "you did. The output becomes the literal body of the author's document, so match " +
  "the voice, register, and formatting conventions of the surrounding context.";

function buildUserContent(req: GenerateRequest): string {
  const parts: string[] = [`Instruction: ${req.instruction}`];
  if (req.sources.length) {
    parts.push(
      "Source material the instruction may draw on (weave into the generated prose; " +
        "do not reproduce verbatim unless the instruction asks for a quote):",
    );
    for (const s of req.sources) parts.push(`--- source ${s.id} ---\n${s.content_md}`);
  }
  if (req.currentText !== null) {
    parts.push(`Current draft of this span, to revise per the instruction above:\n${req.currentText}`);
  }
  parts.push(
    `Full document for context, with the active span marked between ${SCOPE_MARK_START} and ` +
      `${SCOPE_MARK_END} (the markers are for your orientation only — never reproduce them):\n${req.documentContext}`,
  );
  return parts.join("\n\n");
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  model: string;
  stop_reason?: string;
  stop_details?: { category?: string | null };
  content: AnthropicContentBlock[];
}

/** Runs §2.3's generation call against the Anthropic Messages API. */
export async function generate(
  env: Env,
  req: GenerateRequest,
  fetchImpl: ProviderFetchLike = platformProviderFetch,
): Promise<GenerateResult> {
  const apiKey = env.AI_PROVIDER_KEY;
  if (!apiKey) throw new ProviderError("AI_PROVIDER_KEY is not configured");
  // Model isn't part of GenerateRequest (§4) — it's provider configuration,
  // resolved here from settings the same way the API key is resolved from
  // env. req.stylePrompt is the site-level style prompt (settings.ai_style_prompt);
  // the caller resolves it, since GenerateRequest already owns that field.
  const settings = await getSettings(env.DB);
  const model = settings.ai_model || DEFAULT_MODEL;
  const finalSystem = req.stylePrompt ? `${SYSTEM_PROMPT}\n\n${req.stylePrompt}` : SYSTEM_PROMPT;

  const res = await fetchImpl(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: finalSystem,
      messages: [{ role: "user", content: buildUserContent(req) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(`provider request failed: ${res.status} ${body}`.trim());
  }

  let json: AnthropicResponse;
  try {
    json = JSON.parse(await res.text());
  } catch {
    throw new ProviderError("provider returned invalid JSON");
  }

  if (json.stop_reason === "refusal") {
    const category = json.stop_details?.category;
    throw new ProviderError(`provider declined the request${category ? ` (${category})` : ""}`);
  }

  const text = json.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!text) throw new ProviderError("provider returned no text content");

  return { text, model: json.model };
}
