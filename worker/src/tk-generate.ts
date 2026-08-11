// /api/items/{id}/generate business logic (tk-core-plan.md §5 task 4) —
// factored out of the Hono route so tests can inject a fixture provider
// fetch, the same DI pattern importer/schedule.ts uses for runScheduledPoll.

import { generate, markDocument, platformProviderFetch, ProviderError, type ProviderFetchLike } from "./ai/provider.ts";
import { getSettings, saveWorkingCopy, setTkProvenance } from "./model.ts";
import { parseScopes, setScopeOutput } from "./tk.ts";
import { resolveFragment } from "./transclusion.ts";
import type { Env, ItemRow } from "./types.ts";
import { nowIso } from "./util.ts";

export type GenerateScopeResult =
  | { ok: true; text: string; model: string }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function runGenerateScope(
  env: Env,
  item: ItemRow,
  scopeIndex: number,
  fetchImpl: ProviderFetchLike = platformProviderFetch,
): Promise<GenerateScopeResult> {
  const { scopes, errors: parseErrors } = parseScopes(item.content_md);
  if (parseErrors.length) {
    return { ok: false, status: 400, body: { error: "working copy has malformed TK scopes", errors: parseErrors } };
  }
  const scope = scopes[scopeIndex];
  if (!scope) return { ok: false, status: 400, body: { error: "unknown scope index" } };

  const sources: { id: string; version: number; content_md: string }[] = [];
  for (const id of scope.sourceIds) {
    const resolved = await resolveFragment(env.DB, id);
    if (!resolved.ok) return { ok: false, status: 400, body: { error: "unresolvable source", id, reason: resolved.reason } };
    sources.push({ id, version: resolved.version.version, content_md: resolved.version.content_md });
  }

  const settings = await getSettings(env.DB);
  let result;
  try {
    result = await generate(
      env,
      {
        instruction: scope.instruction,
        currentText: scope.output,
        sources: sources.map(({ id, content_md }) => ({ id, content_md })),
        documentContext: markDocument(item.content_md, scope.start, scope.end),
        stylePrompt: settings.ai_style_prompt || null,
      },
      fetchImpl,
    );
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, status: 502, body: { error: e.message } };
    throw e;
  }

  const updatedMd = setScopeOutput(item.content_md, scope, result.text);
  await saveWorkingCopy(env.DB, item.id, updatedMd);
  await setTkProvenance(env.DB, item.id, scopeIndex, scopes.length, {
    sources: sources.map(({ id, version }) => ({ id, version })),
    model: result.model,
    at: nowIso(),
  });

  return { ok: true, text: result.text, model: result.model };
}
