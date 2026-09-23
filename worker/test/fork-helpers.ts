// Shared harness for fork.test.ts — re-exports the receive-side predicates
// under test and wraps the two-step (accept, then verify) inbound path into
// one call, since every fork assertion is about the verdict.
import type { FetchLike } from "../src/importer/http.ts";
import { upsertInbound } from "../src/mentions/store.ts";
import { verifyMention, type VerifyResult } from "../src/mentions/receive.ts";

export { forkedVersion, relationTo } from "../src/mentions/receive.ts";

export async function upsertAndVerify(
  db: D1Database,
  source: string,
  target: string,
  targetItemId: string,
  ourOrigin: string,
  map: Record<string, string>,
): Promise<VerifyResult> {
  const fetchFn: FetchLike = async (url) => {
    const body = map[url];
    return {
      ok: body !== undefined,
      status: body !== undefined ? 200 : 404,
      url,
      headers: new Headers(),
      text: async () => body ?? "",
    };
  };
  const row = await upsertInbound(db, source, target, targetItemId);
  return verifyMention(db, row.id, source, targetItemId, ourOrigin, fetchFn);
}
