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
