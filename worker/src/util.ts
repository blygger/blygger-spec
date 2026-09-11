// IDs, hashing, timestamps — v0.1-plan §2.1, §2.2.

import { DEFAULT_MOUNT } from "./types.ts";

/**
 * Normalize the deployment mount path (Env.MOUNT): returns "" for a root
 * mount, otherwise "/seg" or "/seg/seg" — leading slash, no trailing slash.
 * Unset (undefined) falls back to DEFAULT_MOUNT; an explicit "" or "/" is a
 * deliberate root mount, not an omission.
 */
export function normalizeMount(raw: string | undefined): string {
  if (raw === undefined) return DEFAULT_MOUNT;
  let m = raw.trim();
  while (m.endsWith("/")) m = m.slice(0, -1);
  if (m === "") return "";
  return m.startsWith("/") ? m : "/" + m;
}

/**
 * Studio's base path for a given (already-normalized) mount — session 16:
 * studio is nested under the mount, not host-rooted. Single source of truth
 * for the "mount + /studio" convention so index.ts's route registration and
 * every studio.ts / importer/studio.ts link/redirect/embedded-script string
 * can't drift apart the way resolve.ts's duplicated feed-detection once did.
 */
export function studioPath(mount: string): string {
  return mount + "/studio";
}

/** Crockford base32, lowercase, no i/l/o/u. */
export const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/**
 * 128 random bits encoded as 26 chars of lowercase Crockford base32
 * (big-endian, 2 leading zero bits of padding since 26*5 = 130).
 */
export function newId(): string {
  return encodeBase32(crypto.getRandomValues(new Uint8Array(16)), 26);
}

/** Short random key for media objects: 8 chars (40 bits). */
export function newMediaId(): string {
  return encodeBase32(crypto.getRandomValues(new Uint8Array(5)), 8);
}

function encodeBase32(bytes: Uint8Array, chars: number): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = "";
  for (let i = 0; i < chars; i++) {
    out = ID_ALPHABET[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}

/** `"sha256:" + hex(SHA-256(content_md as UTF-8))` */
export async function contentHash(contentMd: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contentMd));
  return "sha256:" + hex(new Uint8Array(digest));
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** ISO 8601 UTC, second precision, Z suffix. */
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** RFC 822/1123 date for RSS elements. */
export function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap HTML for a CDATA section, splitting any `]]>` occurrences. */
export function cdata(s: string): string {
  return "<![CDATA[" + s.replaceAll("]]>", "]]]]><![CDATA[>") + "]]>";
}

/**
 * Rewrite relative src/href attribute URLs in rendered HTML against the
 * blyg's base origin URL — feed descriptions must be self-contained (§2.6).
 */
export function absolutizeHtml(html: string, base: string): string {
  const origin = new URL(base).origin;
  return html.replace(/(src|href)="([^"]*)"/g, (m, attr, url) => {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) || url.startsWith("//") || url.startsWith("#")) return m;
    if (url.startsWith("/")) return `${attr}="${origin}${url}"`;
    return `${attr}="${base}${url}"`;
  });
}

/** Relative time for page bylines: "2h ago", "3d ago". */
export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d}d ago`;
  return `${Math.floor(d / 365)}y ago`;
}
