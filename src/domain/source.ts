/** Where a link came from. Upload is the one Source that never arrives as a URL. */
export type LinkSource = "x" | "instagram" | "youtube" | "facebook" | "allegro" | "amazon" | "web";

/** Base domains (the last two labels, or three for amazon.co.uk-like hosts) per Source; anything else is Web. */
const HOSTS: Record<Exclude<LinkSource, "web">, RegExp> = {
  x: /^x\.com$/,
  instagram: /^instagram\.com$/,
  youtube: /^(youtube\.com|youtu\.be)$/,
  facebook: /^(facebook\.com|fb\.com|fb\.watch)$/,
  allegro: /^allegro\.(pl|com)$/,
  amazon: /^(amazon\.[a-z.]+|amzn\.(to|eu))$/,
};

function baseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split(".");
  // amazon.co.uk, amazon.com.au: keep three labels when the second-level part is a country prefix
  if (parts.length >= 3 && parts[parts.length - 3] === "amazon" && parts[parts.length - 2].length <= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

/**
 * Source of a link by hostname. Expects a URL already passed through `normalizeUrl`, which folds
 * twitter.com into x.com. A Source says where the link came from; how it is read is the reader's business.
 */
export function detectSource(normalizedUrl: string): LinkSource {
  const domain = baseDomain(new URL(normalizedUrl).hostname);
  for (const [source, pattern] of Object.entries(HOSTS) as [Exclude<LinkSource, "web">, RegExp][]) {
    if (pattern.test(domain)) return source;
  }
  return "web";
}
