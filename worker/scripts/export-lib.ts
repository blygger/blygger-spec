// Pure helpers for the static export (scripts/export.ts), split out so the
// origin preflight is testable without running the CLI — same split as
// deploy-lib.ts / deploy-all.ts.

/** A blyg base URL always ends in "/" (siteOrigin's own invariant, protocol.ts). */
export function normalizeBase(url: string): string {
  return url.endsWith("/") ? url : url + "/";
}

/**
 * Hostnames that can never be the origin of a *published* file tree. Covers the
 * loopback names wrangler dev serves on; `.localhost` is reserved for loopback
 * by RFC 6761 §6.3, and 0.0.0.0 is the unspecified address a dev server binds.
 */
export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "::" ||
    /^127\./.test(h)
  );
}

export interface OriginCheck {
  /** Set when the export must not proceed. */
  refuse?: string;
  /** Set when the export may proceed but the operator needs to see something. */
  warn?: string;
}

/**
 * The export bakes *absolute* URLs into the tree it writes — `og:url`,
 * `rel="canonical"`, and the manifest's own `site` — and every one of them is
 * derived by the serving instance from `siteOrigin()` (settings.site_url, else
 * the request origin + mount). Nothing downstream rewrites them, so the bytes
 * we save are the bytes a reader's crawler will follow.
 *
 * Two things can go wrong, and they are not the same thing:
 *
 *   - **The instance declares a loopback origin.** Then every absolute URL in
 *     the tree points at the operator's own machine. There is no host on which
 *     that tree is correct, so this refuses. `settings.site_url` is the fix;
 *     `--allow-local` is the escape hatch for a local-only export (the
 *     byte-identical verification runs against `wrangler dev`).
 *
 *   - **The instance's origin differs from --base.** This is *supported*, and
 *     is exactly what site_url exists for: export from a local or staging
 *     instance, serve the tree at the production origin. It is also what a
 *     misconfiguration looks like, and the two are indistinguishable from here
 *     — so it warns and names both URLs rather than guessing.
 */
export function checkExportOrigin(base: string, site: string | undefined, allowLocal: boolean): OriginCheck {
  if (!site) {
    return { refuse: `blyg.json at ${base} has no "site" field — not a blyg manifest (§4.1).` };
  }

  let parsed: URL;
  try {
    parsed = new URL(site);
  } catch {
    return { refuse: `blyg.json declares site: ${JSON.stringify(site)}, which is not an absolute URL (§4.1).` };
  }

  if (isLocalHost(parsed.hostname) && !allowLocal) {
    return {
      refuse:
        `This instance declares its origin as ${site}, so every absolute URL in the export ` +
        `(og:url, rel=canonical, the manifest's own "site") would point at localhost.\n` +
        `  Fix: set the "Canonical site URL" setting (settings.site_url) to where the files will be served.\n` +
        `  Or:  pass --allow-local if this export is not going to be published.`,
    };
  }

  const normalized = normalizeBase(site);
  if (normalized !== normalizeBase(base)) {
    return {
      warn:
        `fetching from ${normalizeBase(base)} but the instance declares its origin as ${normalized}.\n` +
        `  The exported tree's absolute URLs will all point at ${normalized}.\n` +
        `  That is correct if you are serving this tree there; otherwise fix settings.site_url.`,
    };
  }

  return {};
}

/**
 * Remove the Webmention endpoint advertisement from an exported page.
 *
 * The manifest key is already dropped at export (§2.3.1/§2.3.8: a static tree
 * has no endpoint behind it, so it must not advertise one) — but the pages
 * carry the same advertisement in W3C's own form, `<link rel="webmention">`,
 * and a sender doing W3C discovery reads *that*, never the manifest. Stripping
 * one and keeping the other left every exported tree promising delivery to a
 * URL with nothing behind it: 404 to the sender at best, and at worst a
 * mention delivered to whatever now answers at that path.
 *
 * The `Link:` header carrying the same URL is not an issue here — headers are
 * the static host's, and the export writes files.
 */
export function stripWebmentionLink(html: string): string {
  return html.replace(/[ \t]*<link\b[^>]*\brel=["']?webmention["']?[^>]*>\n?/gi, "");
}
