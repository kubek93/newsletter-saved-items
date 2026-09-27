// X (s, t), Instagram (igsh, igshid), YouTube (si), Meta/Google click ids. Kept narrow: a real
// query parameter stripped by mistake would make two different pages look like one.
const TRACKING_PARAMS = new Set(["s", "t", "igsh", "igshid", "si", "fbclid", "gclid"]);

const HOST_ALIASES: Record<string, string> = {
  "twitter.com": "x.com",
  "www.twitter.com": "x.com",
  "mobile.twitter.com": "x.com",
  "www.x.com": "x.com",
  "mobile.x.com": "x.com",
};

function isTracking(name: string): boolean {
  return TRACKING_PARAMS.has(name) || name.startsWith("utm_");
}

/**
 * The one link inside whatever a client sent as `url`: a string, a list of strings (the Shortcut's
 * "Get URLs from Input" yields a list), or text with a URL somewhere in it. Null when there is none.
 */
export function firstUrl(value: unknown): string | null {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const match = /https?:\/\/\S+/.exec(candidate);
    if (match) return match[0];
  }
  return null;
}

/** Canonical form of a link used for deduplication. Throws on anything that is not an http(s) URL. */
export function normalizeUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase();
  url.hostname = HOST_ALIASES[host] ?? host;
  url.hash = "";

  const kept = [...url.searchParams.entries()].filter(([name]) => !isTracking(name));
  url.search = kept.length ? "?" + new URLSearchParams(kept).toString() : "";

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
