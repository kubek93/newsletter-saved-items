/** Where a link came from. Upload is the fourth Source but never arrives as a URL. */
export type LinkSource = "x" | "instagram" | "web";

/**
 * Source of a link by hostname. Expects a URL already passed through `normalizeUrl`,
 * which folds twitter.com into x.com. YouTube is Web: it differs in how it is read, not where it came from.
 */
export function detectSource(normalizedUrl: string): LinkSource {
  const host = new URL(normalizedUrl).hostname;
  if (host === "x.com") return "x";
  if (host === "instagram.com" || host === "www.instagram.com") return "instagram";
  return "web";
}
