// Injectable fetch abstraction shared by every importer module (resolve,
// feed parser, poller). Decouples "final URL after redirects" from
// platform fetch()'s Response.url quirk (only populated by real network
// fetches) so resolution/poll logic is testable with plain deterministic
// fixture stubs, not a real HTTP layer. platformFetch below is the
// production implementation; tests inject their own FetchLike.

export interface FetchResult {
  ok: boolean;
  status: number;
  /** Final URL after following redirects — the resolve-side identity input (§2.1). */
  url: string;
  headers: Headers;
  text(): Promise<string>;
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<FetchResult>;

/** Every outbound importer request carries this (§4.2). */
export const IMPORTER_USER_AGENT = "blyg-ref/0.2 (+https://blygger.org)";

export const platformFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": IMPORTER_USER_AGENT, ...(init?.headers ?? {}) },
  });
  return {
    ok: res.ok,
    status: res.status,
    url: res.url || url,
    headers: res.headers,
    text: () => res.text(),
  };
};
