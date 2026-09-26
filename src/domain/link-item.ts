import { digestDayFor } from "./digest-day";
import { detectSource } from "./source";
import { normalizeUrl } from "./url";

/** The row to insert for a link shared at `savedAt`. Throws when `url` is not an http(s) URL. */
export function newLinkItem(url: string, savedAt = new Date()) {
  const normalizedUrl = normalizeUrl(url);
  return {
    source: detectSource(normalizedUrl),
    url,
    normalized_url: normalizedUrl,
    saved_at: savedAt.toISOString(),
    digest_day: digestDayFor(savedAt),
  };
}
